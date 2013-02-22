var Config = require('..'),
    chai = require('chai'),
    should = chai.should(),
    DIRNAME = __dirname + '/../fixtures/config';

describe('Config', function(){

    beforeEach(function(){
        delete process.env.NODE_ENV;
    });

    describe('loading', function(){
        it('should add file1', function(){
            var config = new Config(DIRNAME);
            config.add('file1');
            config.value.a.should.equal(1);
            config.value.b.should.equal(2);
            should.not.exist(config.value.c);
        });
        it('should add file2', function(){
            var config = new Config(DIRNAME);
            config.add('file2');
            should.not.exist(config.value.a);
            config.value.b.should.equal(3);
            config.value.c.should.equal(4);
        });
        it('should add file1 then override with file2', function(){
            var config = new Config(DIRNAME);
            config.add('file1');
            config.add('file2');
            config.value.a.should.equal(1);
            config.value.b.should.equal(3);
            config.value.c.should.equal(4);
        });
        it('should add file2 then override with file1', function(){
            var config = new Config(DIRNAME);
            config.add('file2');
            config.add('file1');
            config.value.a.should.equal(1);
            config.value.b.should.equal(2);
            config.value.c.should.equal(4);
        });
        it('should add object', function(){
            var config = new Config();
            config.add({
                a: 'aaa',
                b: 'bbb'
            });
            config.value.a.should.equal('aaa');
            config.value.b.should.equal('bbb');
        });
        it('should override objects using deep merging', function(){
            var config = new Config(DIRNAME);
            config.add({
                a: {
                    b: {
                        c: {
                            d: 1,
                            f: 2
                        }
                    },
                    h: [1,2,3]
                }
            });
            config.add({
                a: {
                    b: {
                        c: {
                            f: 3,
                            g: 4
                        }
                    },
                    h: 42
                }
            });
            config.value.a.b.c.d.should.equal(1);
            config.value.a.b.c.f.should.equal(3);
            config.value.a.b.c.g.should.equal(4);
            config.value.a.h.should.equal(42);
        });
        it('should add file2 with defaults', function(){
            var config = new Config(DIRNAME);
            config.add('file2', {defaults: {a: 11, b: 22, c: 33, d: 44}});
            config.value.a.should.equal(11);
            config.value.b.should.equal(3);
            config.value.c.should.equal(4);
            config.value.d.should.equal(44);
        });
        it('should add file1 then override with file2 and its defaults', function(){
            var config = new Config(DIRNAME);
            config.add('file1');
            config.add('file2', {defaults: {a: 11, b: 22, c: 33, d: 44}});
            config.value.a.should.equal(11);
            config.value.b.should.equal(3);
            config.value.c.should.equal(4);
            config.value.d.should.equal(44);
        });
        it('should add object with defaults using deep merging', function(){
            var config = new Config(DIRNAME);
            config.add({
                a: {
                    b: {
                        c: {
                            d: 1,
                            f: 2
                        }
                    }
                }
            }, {defaults: {
                a: {
                    b: {
                        c: {
                            f: 3,
                            g: 4
                        }
                    }
                }
            }});
            config.value.a.b.c.d.should.equal(1);
            config.value.a.b.c.f.should.equal(2);
            config.value.a.b.c.g.should.equal(4);
        });
        it('should load from module', function(){
            var config = require('../fixtures/config/main');
            config.value.a.should.equal('dev1');
            config.value.b.should.equal('dev2');
            config.value.file1.a.should.equal(1);
            config.value.file1.b.should.equal(2);
            config.value.file2.b.should.equal(3);
            config.value.file2.c.should.equal(4);
        });
    });

    describe('modifiers', function(){

        it('should remove property', function(){
            var config = new Config(DIRNAME);
            config.add({
                a: {
                    b: {
                        c: 1,
                        d: 2
                    }
                }
            });
            config.add({
                a: {
                    b: {
                        c: {
                            $config_remove: true
                        }
                    }
                }
            });
            should.not.exist(config.value.a.b.c);
            should.exist(config.value.a.b.d);
        });

        it('should append item to array', function(){
            var config = new Config(DIRNAME);
            config.add({
                a: ['a']
            });
            config.add({
                a: {
                    $config_append: 'b'
                }
            });
            config.value.a.should.eql(['a', 'b']);
        });
    });

    describe('environments', function(){
        describe('current', function(){

            it('should be development by default', function(){
                var config = new Config(DIRNAME);
                config.env().should.equal('development');
            });
            it('should use NODE_ENV as default', function(){
                process.env.NODE_ENV = 'staging';
                var config = new Config(DIRNAME);
                config.env().should.equal('staging');
            });
            it('should change', function(){
                var config = new Config(DIRNAME);
                config.env('production');
                config.env().should.equal('production');
            });
            it('should be used to add', function(){
                var config = new Config(DIRNAME);

                config.env('production');
                config.add('file1')

                config.env('development');
                config.add('file2')

                config.env('production');
                config.value.a.should.equal(1);
                config.value.b.should.equal(2);
                should.not.exist(config.value.c);

                config.env('development');
                should.not.exist(config.value.a);
                config.value.b.should.equal(3);
                config.value.c.should.equal(4);
            });
        });
        describe('loaded from properties', function(){
            it('should add file1.envs', function(){
                var config = new Config(DIRNAME);
                config.add('file1.envs', {envs: 'prop'});
                config.value.a.should.equal('dev1');
            });
            it('should change environment then add file1.envs', function(){
                var config = new Config(DIRNAME);
                config.env('production');
                config.add('file1.envs', {envs: 'prop'});
                config.value.a.should.equal('prod1');
            });
            it('should add file1.envs then change environment', function(){
                var config = new Config(DIRNAME);
                config.add('file1.envs', {envs: 'prop'});
                config.env('test');
                config.value.a.should.equal('test1');
            });
            it('should add file1.envs then add file2.envs', function(){
                var config = new Config(DIRNAME);
                config.add('file1.envs', {envs: 'prop'});
                config.add('file2.envs', {envs: 'prop'});

                config.env('development');
                config.value.a.should.equal('dev1');
                config.value.b.should.equal('dev2');

                config.env('production');
                config.value.a.should.equal('prod1');
                config.value.b.should.equal('prod2');

                config.env('test');
                config.value.a.should.equal('test2');
                config.value.b.should.equal('test2');
            });
            it('should add file2.envs then add file1.envs', function(){
                var config = new Config(DIRNAME);
                config.add('file2.envs', {envs: 'prop'});
                config.add('file1.envs', {envs: 'prop'});

                config.env('development');
                config.value.a.should.equal('dev1');
                config.value.b.should.equal('dev2');

                config.env('production');
                config.value.a.should.equal('prod1');
                config.value.b.should.equal('prod1');

                config.env('test');
                config.value.a.should.equal('test1');
                config.value.b.should.equal('test2');
            });
        });

        describe('loaded from directories', function(){
            it('should add file1 from environment directories', function(){
                var config = new Config(DIRNAME);
                config.add('file1', {envs: 'dir'});

                config.env('development');
                config.value.a.should.equal('dirdev');
                config.value.b.should.equal('dirdev');

                config.env('production');
                config.value.a.should.equal('dirprod');
                config.value.b.should.equal('dirprod');

                config.env('test');
                config.value.a.should.equal('dirtest');
                config.value.b.should.equal('dirtest');
            });
            it('should add file1 from environment directories then add file1.envs', function(){
                var config = new Config(DIRNAME);
                config.add('file1', {envs: 'dir'});
                config.add('file1.envs', {envs: 'prop'});

                config.env('development');
                config.value.a.should.equal('dev1');
                config.value.b.should.equal('dirdev');

                config.env('production');
                config.value.a.should.equal('prod1');
                config.value.b.should.equal('prod1');

                config.env('test');
                config.value.a.should.equal('test1');
                config.value.b.should.equal('dirtest');
            });
        });
    });

    describe('prefixing', function(){
        it('should add file1 using implicit prefix', function(){
            var config = new Config(DIRNAME);
            config.add('file1', {prefix: true});
            config.value.file1.a.should.equal(1);
            config.value.file1.b.should.equal(2);
        });
        it('should add file1 using named prefix', function(){
            var config = new Config(DIRNAME);
            config.add('file1', {prefix: 'prefix1'});
            config.value.prefix1.a.should.equal(1);
            config.value.prefix1.b.should.equal(2);
        });
        it('should add file1 and file2 using different prefixes', function(){
            var config = new Config(DIRNAME);
            config.add('file1', {prefix: 'prefix1'});
            config.add('file2', {prefix: 'prefix2'});
            config.value.prefix1.a.should.equal(1);
            config.value.prefix1.b.should.equal(2);
            config.value.prefix2.b.should.equal(3);
            config.value.prefix2.c.should.equal(4);
        });
        it('should add file1.envs using prefix', function(){
            var config = new Config(DIRNAME);
            config.add('file1.envs', {envs: 'prop', prefix: 'pre'});
            config.value.pre.a.should.equal('dev1');
        });
    });
});
