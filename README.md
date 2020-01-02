# apk-patcher

> CLI to decompile, patch, recompile and resign apks.

### Usage

```sh
yarn install apk-patcher
apk-patcher -i path/to/file.apk -p path/to/patches
```

Will create two outputs, a signed and non signed version of the input apk with the patches applied.

Patches are https://linux.die.net/man/1/patch, see https://github.com/ouchadam/backdrop-mod for an example. 


### Options

```
-i path to *.apk

-p path to directory containing *.patch files, can also be comma seperated locations or *.patch files
```
