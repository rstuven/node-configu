var fs = require('fs'),
    util = require('util'),
    events = require('events'),
    async = require('async'),
    promptly = require('promptly');

require('js-yaml');

/**
 * An environment-aware configuration utility.
 * @class Config
 * @constructor
 * @param {String} dirname (Optional) The current directory name.
 */
function Config(dirname) {
    events.EventEmitter.call(this);

    this._dirname = dirname || __dirname;

    // for convenience, use NODE_ENV as default (adopted by Express and other popular libraries)
    this._env = process.env.NODE_ENV || 'development';

    this._values = {};
    this._prompts = [];
    this.stdin = process.stdin;
    this.stdout = process.stdout;

    /**
     * @property {Object} value The configuration of the current environment.
     */
    this.value = {};
}

util.inherits(Config, events.EventEmitter);

Config.prototype.on = function(event, listener) {
    if (event == 'ready') {
        buildPrompts(this._prompts, this.value, []);
        if (this._prompts.length == 0) {
            listener();
        } else {
            this.prompt();
            Config.super_.prototype.on.apply(this, [event, listener]);
        }
    }
};

Config.prototype.prompt = function() {
    var _this = this;
    var series = [];
    this._prompts.forEach(function(p){
        var o = p.options;
        o.type = o.type || 'prompt';
        o.message = o.message || p.name;
        if (o.pattern) {
            o.validator = function(value) {
                if (new RegExp(o.pattern).test(value)) {
                    return value;
                }
                throw new Error('Invalid value. ' + (o.description || ''));
            };
            o.retry = true;
        }
        o.input = _this.stdin;
        o.output = _this.stdout;
        series.push(function(callback){
            var fn = function(err, value){
                p.target[p.key] = value;
                callback();
            }
            if (o.choices) {
                promptly.choose(o.message, o.choices, o, fn);
            } else {
                promptly[o.type](o.message, o, fn);
            }
        });
    });
    async.series(series, function(err){
        _this.emit('ready');
    });
};

function buildPrompts(prompts, target, prekey) {
    if (target != null && typeof target == 'object') {
        Object.keys(target).forEach(function(key) {
            var value = target[key];
            buildPrompt(prompts, target, prekey, key, value);
        });
    }
}

function buildPrompt(prompts, target, prekey, key, value) {
    if (/\$$/.test(key)) {
        delete target[key];
        key = key.slice(0, -1);
        var name = prekey.concat(key).join('.');
        var options;
        if (value != null) {
            if (typeof value == 'object') {
                options = value;
            } else if (typeof value == 'string') {
                options = {default: value};
            }
        }
        prompts.push({
            target: target,
            name: name,
            key: key,
            options: options || {}
        });
    } else {
        buildPrompts(prompts, value, prekey.concat(key));
    }
};

/**
 * Gets or sets the current environment.
 * @param {String} env (Optional) The new current environment.
 * @return {String} The current environment.
 * @default NODE_ENV environment variable value if set, 'development' otherwise.
 */
Config.prototype.env = function(env) {
    if (env != null) {
        this._env = env;
        this.value = this._values[this._env];
    }
    return this._env;
};

/**
 * Loads a configuration object from a file.
 * @param {String} dirname The directory name.
 * @param {String} file The file name.
 * @param {Function} cb Callback to return config object.
 * @return {String} The configuration object.
 */
Config.prototype._load = function(dirname, filename, cb) {
    filename = dirname + filename;

    var ext, exts = ['', '.json', '.yaml', '.yml'];
    for (var i = 0; i < exts.length; i++) {
        ext = exts[i];
        if (fs.existsSync(filename + ext)) {
            var config = require(filename + ext);
            cb(config);
            return;
        }
    }
};

/**
 * Gets the base directory name.
 * @return {String} The base directory name.
 */
Config.prototype.dirname = function() {
    return this._dirname + '/';
};

function dirExistsSync (d) {
  try { return fs.statSync(d).isDirectory() }
  catch (er) { return false }
}

/**
 * Adds a configuration.
 * @param {String} filename The configuration file name (without extension).
 * @param {Object} options (Optional) The options object.
 * @return {Object} This Config object.
 */
Config.prototype.add = function(filename, options) {
    var that = this,
        value = {},
        values = {},
        envs = [];

    options = options || {};

    // read config values
    if (typeof filename === 'object') {
        value = filename;
    }
    else if (options.envs === 'dir') {
        value = {};
        fs.readdirSync(this.dirname()).forEach(function(item){
            var dirname = that.dirname() + item + '/';
            if (dirExistsSync(dirname)) {
                that._load(dirname, filename, function(config){
                    value[item] = config;
                });
            }
        });
    }
    else {
        this._load(this.dirname(), filename, function(config){
            value = config;
        });
    }

    if (options.envs == null) {
        // use only the current environment
        envs = [this.env()];
    }
    else {
        // environments are embedded in the config
        envs = Object.keys(value);
    }

    envs.forEach(function(env){

        // build a path to merge the next values
        var path = [env];

        // add prefix path
        if (options.prefix === true) {
            // implicit prefix
            path = path.concat(filename.split('.'));
        }
        else if (typeof options.prefix === 'string') {
            // named prefix
            path = path.concat(options.prefix.split('.'));
        }

        if (options.envs == null) {
            mergePath(values, path, options.defaults, value);
        }
        else {
            mergePath(values, path, options.defaults, value[env]);
        }
    });

    // merge previous values with current values
    merge(this._values, values);

    // update environment
    this.env(this.env());

    // fluent interface
    return this;
};

/**
 * Merge objects recursively.
 * @param {Object} target The target object.
 * @param {Object} source The source object.
 */
function merge(target, source) {
    Object.keys(source).forEach(function(key){
        var value = source[key];
        if (typeof target[key] === 'object' && !(target[key] instanceof Array))
            merge(target[key], value);
        else {
            if (typeof value === 'object' && value != null && value.$config_remove)
                delete target[key];
            else if (typeof value === 'object' && value != null && value.$config_append && target[key] instanceof Array)
                target[key].push(value.$config_append);
            else
                target[key] = value;
        }
    });
}

/**
 * Merge objects at the specified path.
 * @param {Object} target The target object.
 * @param {Array} path The path array.
 * @param {Object} defaults The defaults object.
 * @param {Object} source The source object.
 */
function mergePath(target, path, defaults, source) {
    var values = {};
    path.forEach(function(key){
        if (target[key] == null)
            target[key] = {};
        target = target[key];
    });
    if (typeof defaults === 'object') {
        merge(values, defaults);
    }
    merge(values, source);
    merge(target, values);
}


module.exports = Config;
