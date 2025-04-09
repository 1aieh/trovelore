import { redirect } from "next/navigation";

// Redirect root to orders page
export default function Home() {
  redirect("/orders");
}
