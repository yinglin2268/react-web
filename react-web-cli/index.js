#!/usr/bin/env node

/**
 * Copyright (c) 2015-present, Alibaba Group Holding Limited.
 * All rights reserved.
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
// react-web-cli is installed globally on people's computers. This means
// that it is extremely difficult to have them upgrade the version and
// because there's only one global version installed, it is very prone to
// breaking changes.
//
// The only job of react-web-cli is to init the repository and then
// forward all the commands to the local version of react-web.
//
// If you need to add a new command, please add it to local-cli/.
//
// The only reason to modify this file is to add more warnings and
// troubleshooting information for the `react-web init` command.
//
// Do not make breaking changes! We absolutely don't want to have to
// tell people to update their global version of react-web-cli.
//
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// /!\ DO NOT MODIFY THIS FILE /!\
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

'use strict';

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var spawn = require('cross-spawn');
var chalk = require('chalk');
var prompt = require('prompt');
var semver = require('semver');
/**
 * Used arguments:
 *   -v --version - to print current version of react-web-cli and react-web dependency
 *   if you are in a RW app folder
 * init - to create a new project and npm install it
 *   --verbose - to print logs while init
 *   --version <alternative react-web package> - override default (https://registry.npmjs.org/react-web@latest),
 *      package to install
 */
var argv = require('minimist')(process.argv.slice(2));

var CLI_MODULE_PATH = function() {
  return path.resolve(
    process.cwd(),
    'node_modules',
    'react-web',
    'cli.js'
  );
};

var REACT_WEB_PACKAGE_JSON_PATH = function() {
  return path.resolve(
    process.cwd(),
    'node_modules',
    'react-web',
    'package.json'
  );
};

checkForVersionArgument();

var cli;
var cliPath = CLI_MODULE_PATH();
if (fs.existsSync(cliPath)) {
  cli = require(cliPath);
}

// minimist api
var commands = argv._;
if (cli) {
  cli.run();
} else {
  if (commands.length === 0) {
    console.error(
      'You did not pass any commands, did you mean to run `react-web init`?'
    );
    process.exit(1);
  }

  switch (commands[0]) {
  case 'init':
    if (!commands[1]) {
      console.error(
        'Usage: react-web init <ProjectName> [--verbose]'
      );
      process.exit(1);
    } else {
      init(commands[1], argv.verbose, argv.version);
    }
    break;
  default:
    console.error(
      'Command `%s` unrecognized. ' +
      'Make sure that you have run `npm install` and that you are inside a react-web project.',
      commands[0]
    );
    process.exit(1);
    break;
  }
}

function validatePackageName(name) {
  if (!name.match(/^[$A-Z_][0-9A-Z_$]*$/i)) {
    console.error(
      '"%s" is not a valid name for a project. Please use a valid identifier ' +
        'name (alphanumeric).',
      name
    );
    process.exit(1);
  }

  if (name === 'React') {
    console.error(
      '"%s" is not a valid name for a project. Please do not use the ' +
        'reserved word "React".',
      name
    );
    process.exit(1);
  }
}

function init(name, verbose, rwPackage) {
  validatePackageName(name);

  if (fs.existsSync(name)) {
    createAfterConfirmation(name, verbose, rwPackage);
  } else {
    createProject(name, verbose, rwPackage);
  }
}

function createAfterConfirmation(name, verbose, rwPackage) {
  prompt.start();

  var property = {
    name: 'yesno',
    message: 'Directory ' + name + ' already exists. Continue?',
    validator: /y[es]*|n[o]?/,
    warning: 'Must respond yes or no',
    default: 'no'
  };

  prompt.get(property, function (err, result) {
    if (result.yesno[0] === 'y') {
      createProject(name, verbose, rwPackage);
    } else {
      console.log('Project initialization canceled');
      process.exit();
    }
  });
}

function createProject(name, verbose, rwPackage) {
  var root = path.resolve(name);
  var projectName = path.basename(root);

  console.log(
    'This will walk you through creating a new React Web project in',
    root
  );

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root);
  }

  var packageJsonPath = path.join(root, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    var packageJson = {
      name: projectName,
      version: '0.0.1',
      private: true,
    };
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJson));
  }

  process.chdir(root);

  console.log('Installing react-web package from npm...');

  if (verbose) {
    runVerbose(root, projectName, rwPackage);
  } else {
    run(root, projectName, rwPackage);
  }
}

function getInstallPackage(rwPackage) {
  var packageToInstall = 'react-web';
  var valideSemver = semver.valid(rwPackage);
  if (valideSemver) {
    packageToInstall += '@' + valideSemver;
  } else if (rwPackage) {
    // for tar.gz or alternative paths
    packageToInstall = rwPackage;
  }
  return packageToInstall;
}

function run(root, projectName, rwPackage) {
  exec('npm install --save --save-exact ' + getInstallPackage(rwPackage), function(e, stdout, stderr) {
    if (e) {
      console.log(stdout);
      console.error(stderr);
      console.error('`npm install --save --save-exact react-web` failed');
      process.exit(1);
    }

    var cli = require(CLI_MODULE_PATH());
    cli.init(root, projectName);
  });
}

function runVerbose(root, projectName, rwPackage) {
  var proc = spawn('npm', ['install', '--verbose', '--save', '--save-exact', getInstallPackage(rwPackage)], {stdio: 'inherit'});
  proc.on('close', function (code) {
    if (code !== 0) {
      console.error('`npm install --save --save-exact react-web` failed');
      return;
    }

    cli = require(CLI_MODULE_PATH());
    cli.init(root, projectName);
  });
}

function checkForVersionArgument() {
  if (argv._.length === 0 && (argv.v || argv.version)) {
    console.log('react-web-cli: ' + require('./package.json').version);
    try {
      console.log('react-web: ' + require(REACT_WEB_PACKAGE_JSON_PATH()).version);
    } catch (e) {
      console.log('react-web: n/a - not inside a React Web project directory')
    }
    process.exit();
  }
}
