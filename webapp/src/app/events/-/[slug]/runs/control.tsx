import AddIcon from "@mui/icons-material/Add";
import DataObjectIcon from "@mui/icons-material/DataObject";
import { SubMenu } from "@/app/_components/ui/sub-menu";

export function EventRunControl() {
  return (
    <SubMenu
      items={[
        {
          text: "ゲームを追加",
          href: `/`,
          icon: <AddIcon />,
        },
        {
          text: "JSONインポート",
          href: `/`,
          icon: <DataObjectIcon />,
        },
      ]}
    />
  );
}
