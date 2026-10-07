import { DefenseStrategy } from "@/types/defense";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DefenseMatrixTableProps {
  defenses: DefenseStrategy[];
}

export function DefenseMatrixTable({ defenses }: DefenseMatrixTableProps) {
  return (
    <Card className="py-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Defense Strategy</th>
                <th className="py-3 px-4">Prevents Extraction?</th>
                <th className="py-3 px-4">Proves Theft in Court?</th>
                <th className="py-3 px-4">Impacts Real Users?</th>
                <th className="py-3 px-4">Survives Fine-Tuning?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {defenses.map((d) => (
                <tr
                  key={d.name}
                  className={`transition ${d.highlight ? "bg-primary/5 font-medium" : "hover:bg-muted/30"}`}
                >
                  <td className="py-4 px-4 font-semibold text-foreground">
                    <div className={d.highlight ? "text-foreground font-bold" : ""}>{d.name}</div>
                    <div className="text-[11px] text-muted-foreground font-normal mt-0.5">{d.summary}</div>
                  </td>
                  <td className="py-4 px-4 font-medium">
                    <Badge variant={d.stopsStatus} className="text-[10px]">
                      {d.stopsTheft}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 font-medium">
                    <Badge variant={d.provesStatus} className="text-[10px]">
                      {d.provesTheft}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 font-medium">
                    <Badge variant={d.impactsStatus} className="text-[10px]">
                      {d.impactsUsers}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 font-medium">
                    <Badge variant={d.survivesStatus} className="text-[10px]">
                      {d.survivesFinetune}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
