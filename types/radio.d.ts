export interface RadioStation {
  uuid: string;
  name: string;
  country: string;
  tags: string[];
  codec: string;
  bitrate: number;
}

export interface RadioTag {
  name: string;
  stationCount: number;
}

/** An empty query lists the most popular stations */
export interface RadioQuery {
  name?: string;
  tag?: string;
}
