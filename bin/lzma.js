#! /usr/local/bin/node

var lzma,
    fs,
    p,
    params,
    mode,
    suffix;

function get_version()
{
    return require(p.join("..", "package.json")).version;
}

function load_req()
{
    p = require("path");
    fs = require("fs");
    lzma = require(p.join("..", "src", "lzma_worker.js")).LZMA;
}

function progress(percent)
{
    if (process.stdout.isTTY) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        if (percent > 0 && percent < 1) {
            process.stdout.write((percent * 100).toFixed(2) + "%");
        }
    }
}


function get_mode()
{
    var i;
    
    if (params.fast) {
        return 1;
    }
    if (params.slow) {
        return 9;
    }
    
    for (i = 1; i < 10; i += 1) {
        if (params[i]) {
            return i;
        }
    }
    
    /// Default to 7.
    return 7;
}

function parse_parameters(options)
{
    var args = {_:[]},
        i,
        len = process.argv.length,
        arg;
    
    function get_val(prop)
    {
        if (options.nonboolean.indexOf(prop) > -1) {
            i += 1;
            return process.argv[i];
        }
        
        return true;
    }
    
    options = options || {};
    
    if (!Array.isArray(options.nonboolean)) {
        options.nonboolean = [];
    }
    
    for (i = 2; i < len; i += 1) {
        arg = process.argv[i];
        if (arg[0] === "-") {
            if (arg[1] === "-") {
                /// Double
                args[arg.substr(2)] = get_val(arg.substr(2));
            } else {
                /// Single
                arg.substr(1).split("").forEach(function oneach(letter)
                {
                    args[letter] = get_val(letter);
                })
            }
        } else {
            args._.push(arg);
        }
    }
    
    return args;
}

function stdout_is_ok()
{
    return params.f || params.force || !process.stdout.isTTY;
}

function array2buffer(data)
{
    var buf = new Buffer(data.length),
        j,
        len = data.length;
    
    for (j = 0; j < len; j += 1) {
        buf[j] = (data[j] < 0 ? data[j] + 256 : data[j]);
    }
    
    return buf;
}

function write_file(path, mixed, orig)
{
    //console.log(mixed)
    //console.log(path)
    fs.writeFileSync(path, mixed);
    
    if (orig && !params.k && !params.keep) {
        try {
            fs.unlink(orig);
        } catch (e) {
            console.log(e);
        }
    }
}

function compress_files(files)
{
    (function loop(i)
    {
        if (i >= files.length) {
            return;
        }
        
        if (!params.c && !params.stdout && !params.f && !params.force && fs.existsSync(files[i] + suffix)) {
            console.log("File already exists. Use -f to force overwrite.");
            return loop(i + 1);
        }
        
        if ((params.c || params.stdout) && !stdout_is_ok()) {
            console.log("Compressed data not written to a terminal. Use -f to force compression.");
            console.log("For help, type: lzma.js -h");
            return loop(i + 1);
        }
        
        lzma.compress(fs.readFileSync(files[i], "utf8"), mode, function ondone(data)
        {
            var j,
                len,
                buf;
            
            if (params.c || params.stdout) {
                len = data.length;
                buf = new Buffer(1);
                for (j = 0; j < len; j += 1) {
                    buf[0] = data[j] < 0 ? data[j] + 256 : data[j];
                    process.stdout.write(buf);
                }
            } else {
                write_file(files[i] + suffix, array2buffer(data), files[i]);
            }
            loop(i + 1);
        }, params.v || params.verbose ? progress : null);
    }(0));
}
                }
            } else {
                write_file(array2buffer(data), files[i] + suffix);
            }
        }, progress);
    }(0));
}

params = parse_parameters({nonboolean: ["S", "suffix"]});

load_req();

if (params.h || params.help) {
    console.log("LZMA-JS " + get_version() + " © 2015 Nathan Rugg | MIT");
    console.log("Based on LZMA SDK");
    console.log("");
    console.log("Usage: lzma.js [flags and input files in any order]");
    console.log("  -c --stdout       output to standard output");
    console.log("  -d --decompress   force decompression");
    console.log("  -z --compress     force compression");
    console.log("  -k --keep         keep (don't delete) input files");
    console.log("  -f --force        force overwrite of output file and compress links");
    console.log("  -t --test         test compressed file integrity");
    console.log("  -S .suf  --suffix .suf   use suffix .suf on compressed files");
    console.log("  -q --quiet        suppress error messages");
    console.log("  -v --verbose      be verbose");
    console.log("  -h --help         print this message");
    console.log("  -L --license      display the license information");
    console.log("  -V --version      display version numbers of LZMA SDK and lzma");
    console.log("  -1 .. -2          fast compression");
    console.log("  -3 .. -9          good to excellent compression. -7 is the default.");
    console.log("     --fast         alias for -1");
    console.log("     --best         alias for -9 (usually *not* what you want)");
    console.log("");
    console.log("  Memory usage depends a lot on the chosen compression mode -1 .. -9.");
    console.log("  NOTE: Mode 9 does not always produce the smallest file.");
    console.log("");
    process.exit();
}

if (params.L || params.license) {
    console.log(fs.readFileSync(p.join(__dirname, "..", "LICENSE"), "utf8"));
    process.exit();
}

if (params.V || params.version) {
    console.log(get_version());
    process.exit();
}

suffix = params.S || params.suffix || ".lzma";

if (params._.length) {
    ///NOTE: -t and --test must be decompress.
    if (params.z || params.compress || !(params.d || params.decompress || params.t || params.test)) {
        mode = get_mode();
        compress_files(params._);
    }
} else {
    console.log("TODO: STDIN");
}

