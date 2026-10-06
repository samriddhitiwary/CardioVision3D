import { Badge } from "../../../components/ui/Badge"

export function RiskBadge({ band }: { band: string | undefined | null }) {
  if (!band || band === "Not assessed") {
    return <Badge variant="neutral">Not assessed</Badge>
  }
  
  if (band.toLowerCase() === "high") {
    return <Badge variant="danger">High Risk</Badge>
  }
  if (band.toLowerCase() === "moderate") {
    return <Badge variant="warning">Moderate</Badge>
  }
  if (band.toLowerCase() === "low") {
    return <Badge variant="success">Low Risk</Badge>
  }
  
  return <Badge variant="neutral">{band}</Badge>
}
