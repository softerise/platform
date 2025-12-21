import { Card, CardContent, CardHeader, CardTitle, Badge } from '@project/ui';

interface SkillsSummary {
  foundational_skills?: string[];
  combined_skills?: string[];
  integrated_skills?: string[];
  total_skills_count?: number;
}

interface SkillsSummaryCardProps {
  skills: SkillsSummary | null | undefined;
}

export function SkillsSummaryCard({ skills }: SkillsSummaryCardProps) {
  if (!skills) {
    return (
      <Card className="border border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          No skills summary available
        </CardContent>
      </Card>
    );
  }

  const foundationalSkills = skills.foundational_skills ?? [];
  const combinedSkills = skills.combined_skills ?? [];
  const integratedSkills = skills.integrated_skills ?? [];
  const totalCount = skills.total_skills_count ?? 0;

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Skills Summary ({totalCount} total)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Foundational */}
        {foundationalSkills.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Foundational Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {foundationalSkills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-purple-500/10 border-purple-500/30"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Combined */}
        {combinedSkills.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Combined Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {combinedSkills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-blue-500/10 border-blue-500/30"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Integrated */}
        {integratedSkills.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Integrated Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {integratedSkills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-emerald-500/10 border-emerald-500/30"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {foundationalSkills.length === 0 &&
          combinedSkills.length === 0 &&
          integratedSkills.length === 0 && (
            <p className="text-sm text-muted-foreground">No skills defined</p>
          )}
      </CardContent>
    </Card>
  );
}

