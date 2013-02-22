var fs = require('fs'),
    path = require('path');

/**
 * An environment-aware configuration utility.
 * @class Config
 * @constructor
 * @param {String} dirname (Optional) The current directory name.
 */
function Config(dirname) {
    this._dirname = dirname || __dirname;

    // for convenience, use NODE_ENV as default (adopted by Express and other popular libraries)
    this._env = process.env.NODE_ENV || 'development';

    this._values = {};

    /**
     * @property {Object} value The configuration of the current environment.
     */
    this.value = {};
}

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
 * Loads a configuration object from a JSON file.
 * @param {String} dirname The directory name.
 * @param {String} file The file name.
 * @return {String} The configuration object.
 */
Config.prototype._load = function(dirname, filename) {
    filename = dirname + filename + '.json';
    var json = fs.readFileSync(filename);
    return JSON.parse(json);
};

/**
 * Gets the base directory name.
 * @return {String} The base directory name.
 */
Config.prototype.dirname = function() {
    return this._dirname + '/';
};

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
            if (path.existsSync(dirname + filename + '.json') && fs.statSync(dirname).isDirectory()) {
                value[item] = that._load(dirname, filename);
            }
        });
    }
    else {
        value = this._load(this.dirname(), filename);
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
            path.push(filename);
        }
        else if (typeof options.prefix === 'string') {
            // named prefix
            path.push(options.prefix);
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
        var s = source[key];
        if (typeof target[key] === 'object' && !(target[key] instanceof Array))
            merge(target[key], s);
        else {
            if (typeof s === 'object' && s.$config_remove)
                delete target[key];
            else if (typeof s === 'object' && s.$config_append && target[key] instanceof Array)
                target[key].push(s.$config_append);
            else
                target[key] = s;
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