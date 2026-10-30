import { PvcCardPrinter } from "@/components/dashboard/pvc-cards/PvcCardPrinter";
import { getServerTranslation } from "@/lib/i18n/server";

export default async function PvcCardsPage() {
  const { t } = await getServerTranslation();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900">{t("pvcCards.pageTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t("pvcCards.pageSubtitle")}</p>
      </div>
      <PvcCardPrinter />
    </div>
  );
}
