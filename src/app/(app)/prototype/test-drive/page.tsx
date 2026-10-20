import { redirect } from "next/navigation";

export default function TestDrivePrototypePage() {
  redirect("/crm-next/deals/start?pathway=test-drive&new=1&review=test-drive");
}
