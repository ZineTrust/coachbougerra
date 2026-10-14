import { notFound } from "next/navigation";

// Any unknown address under /fr or /ar shows the translated "page not found".
export default function CatchAll() {
  notFound();
}
