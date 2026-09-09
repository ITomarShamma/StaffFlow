/* eslint-disable @next/next/no-img-element */
// The Sham Cash mark, served from public/brand/mark.svg so the real file can be dropped in.

export function BrandMark({ size }: { size: number }) {
  return <img src="/brand/mark.svg" width={size} height={size} alt="" className="block shrink-0" />;
}
