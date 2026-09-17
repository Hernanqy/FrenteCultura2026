export type Member = {
  id: number;
  workspace_id: string;
  name: string;
  base: number | null;
  role: string;
};

export type Task = {
  id: number;
  workspace_id: string;
  phase: number;
  title: string;
  done: boolean;
};

export type Activity = {
  id: number;
  workspace_id: string;
  name: string;
  activity_date: string;
  place: string;
  attendees: number;
  adherents: number;
  status: string;
};

export type Contact = {
  id: number;
  workspace_id: string;
  name: string;
  type: string;
  discipline: string;
  neighborhood: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  sustained: boolean;
};

export type Entity = Member | Task | Activity | Contact;
export type EntityKind = "member" | "task" | "activity" | "contact";
