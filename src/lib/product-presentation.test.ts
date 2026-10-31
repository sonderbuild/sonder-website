import { productMarketing } from "../../sanity/schemaTypes/productMarketing";
import { describe, expect, it } from "vitest";
import { currentProductName, isMactricPresentation } from "./product-presentation";
import { getProduct } from "@/data/products";
import config from "../../next.config";
describe("canonical Mactric identity", () => {
 it("has one product and rejects retired lookup names", () => {
  expect(getProduct("mactric")).toMatchObject({ id: "mactric", slug: "mactric", name: "Mactric" });
  expect(getProduct("monitor")).toBeUndefined();
  expect(getProduct("pulse")).toBeUndefined();
 });
 it("has no product-specific legacy redirects", async () => {
  expect(await config.redirects?.()).toEqual([{ source: "/products/:path*", destination: "/apps/:path*", permanent: true }]);
 });
 it("requires canonical product and presentation", () => {
  expect(isMactricPresentation("mactric", "Mactric")).toBe(true);
  for (const pair of [["cue", "Mactric"], ["monitor", "Monitor"], ["mactric", "Wrong"]]) expect(isMactricPresentation(...pair as [string,string])).toBe(false);
  expect(currentProductName("mactric", "Mactric")).toBe("Mactric");
 });
});

it("shows Mactric in Studio without rekeying existing documents", () => {
 const field = productMarketing.fields.find(field => field.name === "productId");
 expect(field).toMatchObject({ options: { list: [
  { title: "Mactric", value: "mactric" }, { title: "Frame", value: "frame" },
  { title: "Crate", value: "crate" }, { title: "Cue", value: "cue" },
 ] } });
});
