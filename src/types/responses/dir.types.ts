type DirResponseAttribs = {
  directory: string;
};

type DirResponseFile = {
  type: string;
  name: string;
  size?: string;
  md5?: string;
  mtime?: string;
  bytes?: string;
  files?: string;
  implicit?: string;
};

type DirResponseStat = {
  attribs: DirResponseAttribs;
  file: DirResponseFile[];
};

export type DirResponse = {
  stat: DirResponseStat;
};
