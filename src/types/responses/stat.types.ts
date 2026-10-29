export type StatResponseAttribs = {
  directory: string;
};

export type StatResponseFile = {
  type: string;
  name: string;
  mtime: string;
  /** File size in bytes, for files. */
  size?: string;
  /** MD5 checksum, for files. */
  md5?: string;
};

export type StatResponseStat = {
  attribs: StatResponseAttribs;
  file: StatResponseFile[];
};

export type StatResponse = {
  stat: StatResponseStat;
};
