export interface DefenseStrategy {
  name: string;
  stopsTheft: string;
  stopsStatus: "success" | "warning" | "danger" | "secondary";
  provesTheft: string;
  provesStatus: "success" | "warning" | "danger" | "secondary";
  impactsUsers: string;
  impactsStatus: "success" | "warning" | "danger" | "secondary";
  survivesFinetune: string;
  survivesStatus: "success" | "warning" | "danger" | "secondary";
  summary: string;
  highlight?: boolean;
}
