export type DirResponseAttribs = {
  directory: string;
};

export type DirResponseFile = {
  type: string;
  name: string;
  size?: string;
  md5?: string;
  mtime?: string;
  bytes?: string;
  files?: string;
  implicit?: string;
  /** Link target, for entries of type "symlink". */
  target?: string;
};

export type DirResponseStat = {
  attribs: DirResponseAttribs;
  file: DirResponseFile[];
};

export type DirResponse = {
  stat: DirResponseStat;
};
