import AddIcon from "@mui/icons-material/Add";
import DataObjectIcon from "@mui/icons-material/DataObject";
import { SubMenu } from "@/app/_components/ui/sub-menu";

export function EventRunnerControl({ slug }: { slug: string }) {
  return (
    <SubMenu
      items={[
        {
          text: "走者を追加",
          href: `/events/-/${slug}/runners/new`,
          icon: <AddIcon />,
          disabled: true,
        },
        {
          text: "JSONインポート",
          href: `/events/-/${slug}/runners/import`,
          icon: <DataObjectIcon />,
        },
      ]}
    />
  );
}
