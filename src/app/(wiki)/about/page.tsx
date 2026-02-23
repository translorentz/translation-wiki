import { getServerTranslation } from "@/i18n/server";

export const metadata = {
  title: "About — Deltoi",
};

export default async function AboutPage() {
  const { t } = await getServerTranslation();

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">{t("about.title")}</h1>

      <p className="mt-6 leading-relaxed text-muted-foreground">
        {t("about.mission")}
      </p>

      <h2 className="mt-10 text-xl font-semibold">{t("about.registrationTitle")}</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {t("about.registration")}{" "}
        <a
          href="mailto:bryan@deltoi.com"
          className="text-foreground underline hover:text-primary"
        >
          bryan@deltoi.com
        </a>
      </p>

      <h2 className="mt-10 text-xl font-semibold">{t("about.licenseTitle")}</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {t("about.licenseText")}{" "}
        <a
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline hover:text-primary"
        >
          Creative Commons BY-NC-SA 4.0
        </a>{" "}
        {t("about.licenseSuffix")}
      </p>
    </main>
  );
}
