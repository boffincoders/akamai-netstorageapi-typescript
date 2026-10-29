export type ListResponseFile = {
  type: string;
  name: string;
  size: string;
  md5: string;
  mtime: string;
};

export type ListResponseResume = {
  start: string;
};

export type ListResponseList = {
  file: ListResponseFile[];
  resume: ListResponseResume[];
};

export type ListResponse = {
  list: ListResponseList;
};
