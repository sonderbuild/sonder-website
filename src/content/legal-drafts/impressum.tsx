import { Container } from "@/components/ui/container";

export default function ImpressumDraftPage() {
  return <Container className="py-20 sm:py-28"><article lang="de" className="mx-auto max-w-3xl text-base leading-7">
    <p className="eyebrow">Lokaler Entwurf · Stand 31.10.2026</p><h1 className="display mt-6 text-5xl sm:text-7xl">Impressum</h1>
    <p role="note" className="mt-8 border border-current p-5 font-medium">Nicht zur Veröffentlichung freigegeben. Dieser Entwurf ist unvollständig und ersetzt keine geprüften Rechtstexte. Alle OFFEN-Markierungen sind vor Veröffentlichung zu klären.</p>
    <h2 className="mt-10 text-2xl">Anbieter</h2><p className="mt-4">Laurens Karpf · sonder<br />Natürliche Person; keine eingetragene Gesellschaft.</p>
    <p className="mt-4 font-medium">[OFFEN: freigegebene ladungsfähige Anschrift]</p>
    <p className="type-body mt-4">Vorgesehen: BASIC von Impressum-Privatschutz. Vertragsabschluss, vollständige Einrichtung, unterschriebene Zustellungsvollmacht und die individuell zugewiesene c/o-Anschrift sind noch nachzuweisen. Die Anbieter-Signaturadresse wird nicht als eigene Anschrift übernommen.</p>
    <h2 className="mt-10 text-2xl">Kontakt</h2><p className="mt-4"><a className="link" href="mailto:hello@sonder.build">hello@sonder.build</a></p><p className="mt-4">[OFFEN: erforderliche ergänzende Kontaktangaben prüfen und freigeben]</p>
    <h2 className="mt-10 text-2xl">Register und Kennnummern</h2><p className="type-body mt-4">Nach Betreiberangabe bestehen derzeit kein Handelsregistereintrag und keine Umsatzsteuer-ID. Vor Veröffentlichung den aktuellen Stand und gegebenenfalls weitere erforderliche Kennnummern prüfen.</p>
  </article></Container>;
}
