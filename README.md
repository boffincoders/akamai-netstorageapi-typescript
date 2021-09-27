# akamai-netstorageapi-typescript
Akamai Netstorage Typescript (UNOFFICIAL)

This is a complete typescript rewirte of a official NodeJS package for Akamai Netstorage

# Table of Contents
* [Installation](#installation)
* [Example](#example)
* [Methods](#methods)
  * [delete](#delete)
  * [deleteAsync](#deleteAsync)
  * [dir](#dir)
  * [dirAsync](#dirAsync)
  * [listAsync](#list)
  * [listAsync](#listAsync)
  * [download](#download)
  * [downloadAsync](#downloadAsync)
  * [downloadBuffer](#downloadBuffer)
  * [downloadBufferAsync](#downloadBufferAsync)
  * [du](#du)
  * [duAsync](#duAsync)
  * [mkdir](#mkdir)
  * [mkdirAsync](#mkdirAsync)
  * [mtime](#mtime)
  * [mtimeAsync](#mtimeAsync)
  * [quickDelete](#quickDelete)
  * [quickDeleteAsync](#quickDeleteAsync)
  * [rename](#rename)
  * [renameAsync](#renameAsync)
  * [rmdir](#rmdir)
  * [rmdirAsync](#rmdirAsync)
  * [stat](#stat)
  * [statAsync](#statAsync)
  * [symlink](#symlink)
  * [symlinkAsync](#symlinkAsync)
  * [upload](#upload)
  * [uploadAsync](#uploadAsync)
  * [uploadBuffer](#upload)
  * [uploadBufferAsync](#uploadAsync)
* [Author](#author)
* [License](#license)

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
* [delete](#delete)
* [deleteAsync](#deleteAsync)
* [dir](#dir)
* [dirAsync](#dirAsync)
* [listAsync](#list)
* [listAsync](#listAsync)
* [download](#download)
* [downloadAsync](#downloadAsync)
* [downloadBuffer](#downloadBuffer)
* [downloadBufferAsync](#downloadBufferAsync)
* [du](#du)
* [duAsync](#duAsync)
* [mkdir](#mkdir)
* [mkdirAsync](#mkdirAsync)
* [mtime](#mtime)
* [mtimeAsync](#mtimeAsync)
* [quickDelete](#quickDelete)
* [quickDeleteAsync](#quickDeleteAsync)
* [rename](#rename)
* [renameAsync](#renameAsync)
* [rmdir](#rmdir)
* [rmdirAsync](#rmdirAsync)
* [stat](#stat)
* [statAsync](#statAsync)
* [symlink](#symlink)
* [symlinkAsync](#symlinkAsync)
* [upload](#upload)
* [uploadAsync](#uploadAsync)
* [uploadBuffer](#upload)
* [uploadBufferAsync](#uploadAsync)

### delete
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript 
ns.delete(NETSTORAGE_PATH, callback(err, response, body)) 
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path for the file, not the directory |

### deleteAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript 
ns.deleteAsync(NETSTORAGE_PATH) 
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path for the file, not the directory |


- **Response**: ***Promise<DeleteResponse>***

### dir
*[↑ back to method list](#methods)*
- **Syntax**:
```Javascript
ns.dir(NETSTORAGE_PATH|OPTIONS, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path for the directory |
  | `OPTIONS` | *object* | JSON object containing options for the dir method |
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
*[↑ back to method list](#methods)*
- **Syntax**:
```Javascript
ns.dirAsync(NETSTORAGE_PATH|OPTIONS)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path for the directory |
  | `OPTIONS` | *DirListOpts* | JSON object containing options for the dir method |
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
- **Response**: ***Promise<DirResponse>***


### list
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.list(NETSTORAGE_PATH|OPTIONS, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory |
  | `OPTIONS` | *object* | JSON object containing options for the list method |
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
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.listAsync(NETSTORAGE_PATH|OPTIONS)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory |
  | `OPTIONS` | *DirListOpts* | JSON object containing options for the list method |
- **Valid Options**:
```Javascript
  { path: '/your/path', 
    actions: { 
      max_entries: integer,
      end: '/end/path/'
    }
  }
```
- **Response**: ***Promise<ListResponse>***


### download
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.download(NETSTORAGE_SOURCE, LOCAL_DESTINATION, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `NETSTORAGE_SOURCE` | *string* | Path to the file in NetStorage |
  | `LOCAL_DESTINATION` | *string* | Location on the local host to write the downloaded file to (Optional value) | 

### downloadAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.downloadAsync(NETSTORAGE_SOURCE, LOCAL_DESTINATION)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `NETSTORAGE_SOURCE` | *string* | Path to the file in NetStorage |
  | `LOCAL_DESTINATION` | *string* | Location on the local host to write the downloaded file to (Optional value) | 
- **Response**: ***Promise<DownloadResponse>***

### downloadBuffer
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.downloadBuffer(NETSTORAGE_SOURCE, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `NETSTORAGE_SOURCE` | *string* | Path to the file in NetStorage |

### downloadBufferAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.downloadBufferAsync(NETSTORAGE_SOURCE)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `NETSTORAGE_SOURCE` | *string* | Path to the file in NetStorage |

- **Response**: ***Promise<DownloadBufferResponse>***



### du
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.du(NETSTORAGE_PATH, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory |

### duAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.duAsync(NETSTORAGE_PATH)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory |

- **Response**: ***Promise<DuResponse>***


### mkdir
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.mkdir(DIRECTORY_NAME, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `DIRECTORY_NAME` | *string* | Full path to the directory you wish to create |

### mkdirAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.mkdirAsync(DIRECTORY_NAME)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `DIRECTORY_NAME` | *string* | Full path to the directory you wish to create |

- **Response**: ***Promise<MkdirResponse>***


### mtime
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.mtime(NETSTORAGE_PATH, UNIX_TIME, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory |
  | `UNIX_TIME` | integer | Unix time to set the mtime of the file to. Note that millisecond accuracy is not supported |



### mtimeAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.mtimeAsync(NETSTORAGE_PATH, UNIX_TIME)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory |
  | `UNIX_TIME` | integer | Unix time to set the mtime of the file to. Note that millisecond accuracy is not supported |

- **Response**: ***Promise<MtimeResponse>***


### quickDelete
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.quickDelete(NETSTORAGE_DIR, callback(err, response, body)) // needs to be enabled on the CP Code
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_DIR` | *string* | full path to the directory you wish to delete|


### quickDeleteAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.quickDeleteAsync(NETSTORAGE_DIR) // needs to be enabled on the CP Code
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_DIR` | *string* | full path to the directory you wish to delete|

- **Response**: ***Promise<QuickDeleteResponse>***


### rename
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.rename(NETSTORAGE_TARGET, NETSTORAGE_DESTINATION, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_TARGET` | *string* | full path to the original file/directory |
	| `NETSTORAGE_DESTINATION` | *string* | full path to the renamed file/directory |


### renameAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.renameAsync(NETSTORAGE_TARGET, NETSTORAGE_DESTINATION)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_TARGET` | *string* | full path to the original file/directory |
	| `NETSTORAGE_DESTINATION` | *string* | full path to the renamed file/directory |

- **Response**: ***Promise<RenameResponse>***


### rmdir
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.rmdir(NETSTORAGE_DIR, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_DIR` | *string* | full path to the empty object you wish to delete |



### rmdirAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.rmdirAsync(NETSTORAGE_DIR)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_DIR` | *string* | full path to the empty object you wish to delete |

- **Response**: ***Promise<RmdirResponse>***


### stat
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.stat(NETSTORAGE_PATH, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory you wish to stat |

### statAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.statAsync(NETSTORAGE_PATH)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
	| `NETSTORAGE_PATH` | *string* | full path to the file/directory you wish to stat |

- **Response**: ***Promise<StatResponse>***


### symlink
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.symlink(NETSTORAGE_SOURCE, NETSTORAGE_TARGET, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `NETSTORAGE_SOURCE` | *string* | full path to the original file |
  | `NETSTORAGE_TARGET` | *string* | full path of the new symlinked file to create |

### symlinkAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.symlinkAsync(NETSTORAGE_SOURCE, NETSTORAGE_TARGET)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `NETSTORAGE_SOURCE` | *string* | full path to the original file |
  | `NETSTORAGE_TARGET` | *string* | full path of the new symlinked file to create |

- **Response**: ***Promise<SymlinkResponse>***


### upload
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.upload(LOCAL_SOURCE, NETSTORAGE_DESTINATION, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `LOCAL_SOURCE` | *string* | Path to the local file you wish to upload |
  | `NETSTORAGE_DESTINATION` | *string* | Path to the location you wish to upload the file. Note that if you omit the actual filename, the source filename is used. You may only upload files using the API, not directories. |

### uploadAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.uploadAsync(LOCAL_SOURCE, NETSTORAGE_DESTINATION)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `LOCAL_SOURCE` | *string* | Path to the local file you wish to upload |
  | `NETSTORAGE_DESTINATION` | *string* | Path to the location you wish to upload the file. Note that if you omit the actual filename, the source filename is used. You may only upload files using the API, not directories. |
- **Response**: ***Promise<UploadResponse>***

### uploadBuffer
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.uploadBuffer(LocalBuffer, Basename, NETSTORAGE_DESTINATION, callback(err, response, body))
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `LocalBuffer` | *Buffer* | Buffer of the file you wish to upload |
  | `Basename` | *string* | Filename you wish to keep for the uploaded file along with the extension.
  | `NETSTORAGE_DESTINATION` | *string* | Path to the location you wish to upload the file. You may only upload files using the API, not directories. |

### uploadBufferAsync
*[↑ back to method list](#methods)*
- **Syntax**: 
```Javascript
ns.uploadBufferAsync(LOCAL_SOURCE, NETSTORAGE_DESTINATION)
```
- **Parameters**:

	| Name        | Type        | Description                     |
	| :---------- | :---------: | :------------------------------ |
  | `LocalBuffer` | *Buffer* | Buffer of the file you wish to upload |
  | `Basename` | *string* | Filename you wish to keep for the uploaded file along with the extension.
  | `NETSTORAGE_DESTINATION` | *string* | Path to the location you wish to upload the file. You may only upload files using the API, not directories. |
- **Response**: ***Promise<UploadResponse>***

# Author

Boffin Coders (info@boffincoders.com)  
Thanks to Astin Choi (achoi@akamai.com) as well for writing the origianl lib.
# License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
