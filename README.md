# Akamai Netstorage Typescript (UNOFFICIAL)

This is a complete typescript rewirte of a official NodeJS package for Akamai Netstorage([netstorageapi](https://www.npmjs.com/package/netstorageapi)) with added support of download and upload via buffer and async methods to avoid callback way. You can still use callback methods as well in same way.

# Table of Contents

- [Installation](#installation)
- [Example](#example)
- [Methods](#methods)
  - [delete](#delete)
  - [deleteAsync](#deleteAsync)
  - [dir](#dir)
  - [dirAsync](#dirAsync)
  - [listAsync](#list)
  - [listAsync](#listAsync)
  - [download](#download)
  - [downloadAsync](#downloadAsync)
  - [downloadBuffer](#downloadBuffer)
  - [downloadBufferAsync](#downloadBufferAsync)
  - [du](#du)
  - [duAsync](#duAsync)
  - [mkdir](#mkdir)
  - [mkdirAsync](#mkdirAsync)
  - [mtime](#mtime)
  - [mtimeAsync](#mtimeAsync)
  - [quickDelete](#quickDelete)
  - [quickDeleteAsync](#quickDeleteAsync)
  - [rename](#rename)
  - [renameAsync](#renameAsync)
  - [rmdir](#rmdir)
  - [rmdirAsync](#rmdirAsync)
  - [stat](#stat)
  - [statAsync](#statAsync)
  - [symlink](#symlink)
  - [symlinkAsync](#symlinkAsync)
  - [upload](#upload)
  - [uploadAsync](#uploadAsync)
  - [uploadBuffer](#upload)
  - [uploadBufferAsync](#uploadAsync)
- [Author](#author)
- [License](#license)

# Installation

To install Netstorage API with npm global:

```Shell
$ npm install --global netstorageapi
```

or as a development dependency for your project:

```Shell
$ npm install --save netstorageapi
```

# Example

```Javascript
const Netstorage = require('netstorageapi')

// Defaults: SSL: false
// By default no proxy is set
const config = {
  hostname: '*******.akamaihd.net',
  keyName: 'DDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  key: 'xxxxxxxxxx',
  cpCode: '407617',
  ssl: false,
  // proxy: 'https://yourproxyurl.com:port' // Optional
}
// Don't expose KEY on your public repository.

const ns = new Netstorage(config)
const local_source = 'hello.txt'

// or `/${config.cpCode}/` will asume the destination filename is the same as the source
const netstorage_destination = `/${config.cpCode}/hello.txt`

ns.upload(local_source, netstorage_destination, (error, response, body) => {
  if (error) { // errors other than http response codes
    console.log(`Got error: ${error.message}`)
  }
  if (response.statusCode == 200) {
    console.log(body)
  }
});

// Async Way
let response: Promise<UploadResponse> = await ns.uploadAsync(local_source, netstorage_destination)

// { message: 'Request Processed.' }
```

# Methods

- [delete](#delete)
- [deleteAsync](#deleteAsync)
- [dir](#dir)
- [dirAsync](#dirAsync)
- [listAsync](#list)
- [listAsync](#listAsync)
- [download](#download)
- [downloadAsync](#downloadAsync)
- [downloadBuffer](#downloadBuffer)
- [downloadBufferAsync](#downloadBufferAsync)
- [du](#du)
- [duAsync](#duAsync)
- [mkdir](#mkdir)
- [mkdirAsync](#mkdirAsync)
- [mtime](#mtime)
- [mtimeAsync](#mtimeAsync)
- [quickDelete](#quickDelete)
- [quickDeleteAsync](#quickDeleteAsync)
- [rename](#rename)
- [renameAsync](#renameAsync)
- [rmdir](#rmdir)
- [rmdirAsync](#rmdirAsync)
- [stat](#stat)
- [statAsync](#statAsync)
- [symlink](#symlink)
- [symlinkAsync](#symlinkAsync)
- [upload](#upload)
- [uploadAsync](#uploadAsync)
- [uploadBuffer](#upload)
- [uploadBufferAsync](#uploadAsync)

### delete

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.delete(NETSTORAGE_PATH, callback(err, response, body))
```

- **Parameters**:

  | Name              |   Type   | Description                               |
  | :---------------- | :------: | :---------------------------------------- |
  | `NETSTORAGE_PATH` | _string_ | full path for the file, not the directory |

### deleteAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.deleteAsync(NETSTORAGE_PATH)
```

- **Parameters**:

  | Name              |   Type   | Description                               |
  | :---------------- | :------: | :---------------------------------------- |
  | `NETSTORAGE_PATH` | _string_ | full path for the file, not the directory |

- **Response**: **_Promise<DeleteResponse>_**

### dir

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.dir(NETSTORAGE_PATH|OPTIONS, callback(err, response, body))
```

- **Parameters**:

  | Name              |   Type   | Description                                       |
  | :---------------- | :------: | :------------------------------------------------ |
  | `NETSTORAGE_PATH` | _string_ | full path for the directory                       |
  | `OPTIONS`         | _object_ | JSON object containing options for the dir method |

- **Valid Options**:

```Javascript
  { path: '/your/path',
    actions: {
      max_entries: integer,
      start: '/start/path',
      end: '/end/path/',
      prefix: 'object-prefix',
      slash: 'both'
    }
  }
```

### dirAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.dirAsync(NETSTORAGE_PATH|OPTIONS)
```

- **Parameters**:

  | Name              |     Type      | Description                                       |
  | :---------------- | :-----------: | :------------------------------------------------ |
  | `NETSTORAGE_PATH` |   _string_    | full path for the directory                       |
  | `OPTIONS`         | _DirListOpts_ | JSON object containing options for the dir method |

- **Valid Options**:

```Javascript
  { path: '/your/path',
    actions: {
      max_entries: integer,
      start: '/start/path',
      end: '/end/path/',
      prefix: 'object-prefix',
      slash: 'both'
    }
  }
```

- **Response**: **_Promise<DirResponse>_**

### list

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.list(NETSTORAGE_PATH|OPTIONS, callback(err, response, body))
```

- **Parameters**:

  | Name              |   Type   | Description                                        |
  | :---------------- | :------: | :------------------------------------------------- |
  | `NETSTORAGE_PATH` | _string_ | full path to the file/directory                    |
  | `OPTIONS`         | _object_ | JSON object containing options for the list method |

- **Valid Options**:

```Javascript
  { path: '/your/path',
    actions: {
      max_entries: integer,
      end: '/end/path/'
    }
  }
```

### listAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.listAsync(NETSTORAGE_PATH|OPTIONS)
```

- **Parameters**:

  | Name              |     Type      | Description                                        |
  | :---------------- | :-----------: | :------------------------------------------------- |
  | `NETSTORAGE_PATH` |   _string_    | full path to the file/directory                    |
  | `OPTIONS`         | _DirListOpts_ | JSON object containing options for the list method |

- **Valid Options**:

```Javascript
  { path: '/your/path',
    actions: {
      max_entries: integer,
      end: '/end/path/'
    }
  }
```

- **Response**: **_Promise<ListResponse>_**

### download

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.download(NETSTORAGE_SOURCE, LOCAL_DESTINATION, callback(err, response, body))
```

- **Parameters**:

  | Name                |   Type   | Description                                                                 |
  | :------------------ | :------: | :-------------------------------------------------------------------------- |
  | `NETSTORAGE_SOURCE` | _string_ | Path to the file in NetStorage                                              |
  | `LOCAL_DESTINATION` | _string_ | Location on the local host to write the downloaded file to (Optional value) |

### downloadAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.downloadAsync(NETSTORAGE_SOURCE, LOCAL_DESTINATION)
```

- **Parameters**:

  | Name                |   Type   | Description                                                                 |
  | :------------------ | :------: | :-------------------------------------------------------------------------- |
  | `NETSTORAGE_SOURCE` | _string_ | Path to the file in NetStorage                                              |
  | `LOCAL_DESTINATION` | _string_ | Location on the local host to write the downloaded file to (Optional value) |

- **Response**: **_Promise<DownloadResponse>_**

### downloadBuffer

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.downloadBuffer(NETSTORAGE_SOURCE, callback(err, response, body))
```

- **Parameters**:

  | Name                |   Type   | Description                    |
  | :------------------ | :------: | :----------------------------- |
  | `NETSTORAGE_SOURCE` | _string_ | Path to the file in NetStorage |

### downloadBufferAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.downloadBufferAsync(NETSTORAGE_SOURCE)
```

- **Parameters**:

  | Name                |   Type   | Description                    |
  | :------------------ | :------: | :----------------------------- |
  | `NETSTORAGE_SOURCE` | _string_ | Path to the file in NetStorage |

- **Response**: **_Promise<DownloadBufferResponse>_**

### du

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.du(NETSTORAGE_PATH, callback(err, response, body))
```

- **Parameters**:

  | Name              |   Type   | Description                     |
  | :---------------- | :------: | :------------------------------ |
  | `NETSTORAGE_PATH` | _string_ | full path to the file/directory |

### duAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.duAsync(NETSTORAGE_PATH)
```

- **Parameters**:

  | Name              |   Type   | Description                     |
  | :---------------- | :------: | :------------------------------ |
  | `NETSTORAGE_PATH` | _string_ | full path to the file/directory |

- **Response**: **_Promise<DuResponse>_**

### mkdir

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.mkdir(DIRECTORY_NAME, callback(err, response, body))
```

- **Parameters**:

  | Name             |   Type   | Description                                   |
  | :--------------- | :------: | :-------------------------------------------- |
  | `DIRECTORY_NAME` | _string_ | Full path to the directory you wish to create |

### mkdirAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.mkdirAsync(DIRECTORY_NAME)
```

- **Parameters**:

  | Name             |   Type   | Description                                   |
  | :--------------- | :------: | :-------------------------------------------- |
  | `DIRECTORY_NAME` | _string_ | Full path to the directory you wish to create |

- **Response**: **_Promise<MkdirResponse>_**

### mtime

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.mtime(NETSTORAGE_PATH, UNIX_TIME, callback(err, response, body))
```

- **Parameters**:

  | Name              |   Type   | Description                                                                                |
  | :---------------- | :------: | :----------------------------------------------------------------------------------------- |
  | `NETSTORAGE_PATH` | _string_ | full path to the file/directory                                                            |
  | `UNIX_TIME`       | integer  | Unix time to set the mtime of the file to. Note that millisecond accuracy is not supported |

### mtimeAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.mtimeAsync(NETSTORAGE_PATH, UNIX_TIME)
```

- **Parameters**:

  | Name              |   Type   | Description                                                                                |
  | :---------------- | :------: | :----------------------------------------------------------------------------------------- |
  | `NETSTORAGE_PATH` | _string_ | full path to the file/directory                                                            |
  | `UNIX_TIME`       | integer  | Unix time to set the mtime of the file to. Note that millisecond accuracy is not supported |

- **Response**: **_Promise<MtimeResponse>_**

### quickDelete

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.quickDelete(NETSTORAGE_DIR, callback(err, response, body)) // needs to be enabled on the CP Code
```

- **Parameters**:

  | Name             |   Type   | Description                                   |
  | :--------------- | :------: | :-------------------------------------------- |
  | `NETSTORAGE_DIR` | _string_ | full path to the directory you wish to delete |

### quickDeleteAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.quickDeleteAsync(NETSTORAGE_DIR) // needs to be enabled on the CP Code
```

- **Parameters**:

  | Name             |   Type   | Description                                   |
  | :--------------- | :------: | :-------------------------------------------- |
  | `NETSTORAGE_DIR` | _string_ | full path to the directory you wish to delete |

- **Response**: **_Promise<QuickDeleteResponse>_**

### rename

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.rename(NETSTORAGE_TARGET, NETSTORAGE_DESTINATION, callback(err, response, body))
```

- **Parameters**:

  | Name                     |   Type   | Description                              |
  | :----------------------- | :------: | :--------------------------------------- |
  | `NETSTORAGE_TARGET`      | _string_ | full path to the original file/directory |
  | `NETSTORAGE_DESTINATION` | _string_ | full path to the renamed file/directory  |

### renameAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.renameAsync(NETSTORAGE_TARGET, NETSTORAGE_DESTINATION)
```

- **Parameters**:

  | Name                     |   Type   | Description                              |
  | :----------------------- | :------: | :--------------------------------------- |
  | `NETSTORAGE_TARGET`      | _string_ | full path to the original file/directory |
  | `NETSTORAGE_DESTINATION` | _string_ | full path to the renamed file/directory  |

- **Response**: **_Promise<RenameResponse>_**

### rmdir

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.rmdir(NETSTORAGE_DIR, callback(err, response, body))
```

- **Parameters**:

  | Name             |   Type   | Description                                      |
  | :--------------- | :------: | :----------------------------------------------- |
  | `NETSTORAGE_DIR` | _string_ | full path to the empty object you wish to delete |

### rmdirAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.rmdirAsync(NETSTORAGE_DIR)
```

- **Parameters**:

  | Name             |   Type   | Description                                      |
  | :--------------- | :------: | :----------------------------------------------- |
  | `NETSTORAGE_DIR` | _string_ | full path to the empty object you wish to delete |

- **Response**: **_Promise<RmdirResponse>_**

### stat

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.stat(NETSTORAGE_PATH, callback(err, response, body))
```

- **Parameters**:

  | Name              |   Type   | Description                                      |
  | :---------------- | :------: | :----------------------------------------------- |
  | `NETSTORAGE_PATH` | _string_ | full path to the file/directory you wish to stat |

### statAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.statAsync(NETSTORAGE_PATH)
```

- **Parameters**:

  | Name              |   Type   | Description                                      |
  | :---------------- | :------: | :----------------------------------------------- |
  | `NETSTORAGE_PATH` | _string_ | full path to the file/directory you wish to stat |

- **Response**: **_Promise<StatResponse>_**

### symlink

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.symlink(NETSTORAGE_SOURCE, NETSTORAGE_TARGET, callback(err, response, body))
```

- **Parameters**:

  | Name                |   Type   | Description                                   |
  | :------------------ | :------: | :-------------------------------------------- |
  | `NETSTORAGE_SOURCE` | _string_ | full path to the original file                |
  | `NETSTORAGE_TARGET` | _string_ | full path of the new symlinked file to create |

### symlinkAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.symlinkAsync(NETSTORAGE_SOURCE, NETSTORAGE_TARGET)
```

- **Parameters**:

  | Name                |   Type   | Description                                   |
  | :------------------ | :------: | :-------------------------------------------- |
  | `NETSTORAGE_SOURCE` | _string_ | full path to the original file                |
  | `NETSTORAGE_TARGET` | _string_ | full path of the new symlinked file to create |

- **Response**: **_Promise<SymlinkResponse>_**

### upload

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.upload(LOCAL_SOURCE, NETSTORAGE_DESTINATION, callback(err, response, body))
```

- **Parameters**:

  | Name                     |   Type   | Description                                                                                                                                                                         |
  | :----------------------- | :------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `LOCAL_SOURCE`           | _string_ | Path to the local file you wish to upload                                                                                                                                           |
  | `NETSTORAGE_DESTINATION` | _string_ | Path to the location you wish to upload the file. Note that if you omit the actual filename, the source filename is used. You may only upload files using the API, not directories. |

### uploadAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.uploadAsync(LOCAL_SOURCE, NETSTORAGE_DESTINATION)
```

- **Parameters**:

  | Name                     |   Type   | Description                                                                                                                                                                         |
  | :----------------------- | :------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `LOCAL_SOURCE`           | _string_ | Path to the local file you wish to upload                                                                                                                                           |
  | `NETSTORAGE_DESTINATION` | _string_ | Path to the location you wish to upload the file. Note that if you omit the actual filename, the source filename is used. You may only upload files using the API, not directories. |

- **Response**: **_Promise<UploadResponse>_**

### uploadBuffer

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.uploadBuffer(LocalBuffer, Basename, NETSTORAGE_DESTINATION, callback(err, response, body))
```

- **Parameters**:

  | Name                     |   Type   | Description                                                                                                 |
  | :----------------------- | :------: | :---------------------------------------------------------------------------------------------------------- |
  | `LocalBuffer`            | _Buffer_ | Buffer of the file you wish to upload                                                                       |
  | `Basename`               | _string_ | Filename you wish to keep for the uploaded file along with the extension.                                   |
  | `NETSTORAGE_DESTINATION` | _string_ | Path to the location you wish to upload the file. You may only upload files using the API, not directories. |

### uploadBufferAsync

_[↑ back to method list](#methods)_

- **Syntax**:

```Javascript
ns.uploadBufferAsync(LOCAL_SOURCE, NETSTORAGE_DESTINATION)
```

- **Parameters**:

  | Name                     |   Type   | Description                                                                                                 |
  | :----------------------- | :------: | :---------------------------------------------------------------------------------------------------------- |
  | `LocalBuffer`            | _Buffer_ | Buffer of the file you wish to upload                                                                       |
  | `Basename`               | _string_ | Filename you wish to keep for the uploaded file along with the extension.                                   |
  | `NETSTORAGE_DESTINATION` | _string_ | Path to the location you wish to upload the file. You may only upload files using the API, not directories. |

- **Response**: **_Promise<UploadResponse>_**

# Author

Boffin Coders (info@boffincoders.com)  
Thanks to Astin Choi (achoi@akamai.com) as well for writing the origianl lib.
