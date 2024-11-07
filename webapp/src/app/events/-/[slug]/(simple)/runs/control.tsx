import AddIcon from "@mui/icons-material/Add";
import DataObjectIcon from "@mui/icons-material/DataObject";
import { SubMenu } from "@/app/_components/ui/sub-menu";

export function EventRunControl({ slug }: { slug: string }) {
  return (
    <SubMenu
      items={[
        {
          text: "ゲームを追加",
          href: `/`,
          icon: <AddIcon />,
          disabled: true,
        },
        {
          text: "JSONインポート",
          href: `/events/-/${slug}/runs/import`,
          icon: <DataObjectIcon />,
        },
      ]}
    />
  );
}
