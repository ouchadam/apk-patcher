# apk-patcher

> CLI to decompile, patch, recompile and resign apks.

### Usage

```sh
npx apk-patcher patch path/to/file.apk path/to/patches

npx apk-patcher diff path/to/file.apk path/to/other.apk
```

Will create two outputs, a signed and non signed version of the input apk with the patches applied.

Patches are https://linux.die.net/man/1/patch, see https://github.com/ouchadam/backdrop-mod for an example. 
