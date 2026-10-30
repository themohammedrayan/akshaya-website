/**
 * Renders the dashboard header's Tools dropdown on its own, so it can be
 * screenshotted and clicked through without a signed-in dashboard.
 */
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ToolsMenu } from "@/components/dashboard/ToolsMenu";

export function mountToolsMenu(container: HTMLElement, lang: "en" | "ml") {
  const root = createRoot(container);
  root.render(
    <LanguageProvider initialLang={lang}>
      <div className="flex items-center justify-end gap-3">
        <ToolsMenu />
      </div>
    </LanguageProvider>,
  );
  return root;
}
