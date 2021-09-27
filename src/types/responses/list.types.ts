type ListResponseFile = {
  type: string;
  name: string;
  size: string;
  md5: string;
  mtime: string;
};

type ListResponseResume = {
  start: string;
};

type ListResponseList = {
  file: ListResponseFile[];
  resume: ListResponseResume[];
};

export type ListResponse = {
  list: ListResponseList;
};
