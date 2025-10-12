import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Users, Calendar } from "lucide-react";

export function ScheduleConstraints() {
  return (
    <Card className="border-l-4 border-l-purple-500 bg-purple-50">
      <CardHeader>
        <CardTitle className="text-lg text-purple-800 flex items-center gap-2">
          <Info className="h-5 w-5" />
          Schedule Business Constraints
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-800">
                Agent Training Limit
              </h3>
              <p className="text-sm text-purple-700">
                Maximum <Badge variant="outline">2 sessions</Badge> per agent per week
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Ensures agents maintain productivity and aren't pulled from phones too frequently
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-800">
                Manager Team Balance
              </h3>
              <p className="text-sm text-purple-700">
                Maximum <Badge variant="outline">2 agents</Badge> from the same manager per time slot
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Prevents entire teams from being off the phones simultaneously
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-100 rounded-lg">
            <p className="text-xs text-purple-800">
              <strong>Note:</strong> Some agents may need to be scheduled across multiple weeks if constraints cannot be met. The system prioritizes lowest CAP scores while respecting these business rules.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
