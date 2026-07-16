export type QueryRole = "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY";

export type QueryRow = {
  role: QueryRole;
  name: string;
  idNumber: string;
};
