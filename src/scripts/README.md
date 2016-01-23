### Command Line Interface

All commands can be invoked with `cli`.
Ex: `cli import`.
`cli import -n -p BlinkProject ../tinyos/apps/Blink -r`

### cli Usage
```
Usage: cli [options] [command]

Commands:

  import      import TinyOS app
  help [cmd]  display help for [cmd]

Options:

  -h, --help     output usage information
  -V, --version  output the version number
```

### cli-import Usage
```
Usage: cli-import [options]

Options:

  -h, --help             output usage information
  -V, --version          output the version number
  -n --new               Create new project
  -p --project [string]  Project [mandatory]
  -b --branch [string]   Branch [mandatory, if new is not set]
  -r --recursive         Recursive
```
