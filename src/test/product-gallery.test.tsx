import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductGallery } from "@/components/site/product-gallery";

describe("ProductGallery", () => {
  const images = ["/a.jpg", "/b.jpg", "/c.jpg"];

  it("shows the main image and a thumbnail per image", () => {
    render(<ProductGallery images={images} alt="Piece" pieceNumber="01" catalogSize={6} />);

    const main = screen.getByAltText("Piece") as HTMLImageElement;
    expect(main.getAttribute("src")).toBe("/a.jpg");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("switches the main image when a thumbnail is picked", () => {
    render(<ProductGallery images={images} alt="Piece" pieceNumber="01" catalogSize={6} />);

    fireEvent.click(screen.getByLabelText("Show image 2"));

    expect((screen.getByAltText("Piece") as HTMLImageElement).getAttribute("src")).toBe("/b.jpg");
  });

  it("caps the gallery at four images", () => {
    render(
      <ProductGallery
        images={["/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg"]}
        alt="Piece"
        pieceNumber="01"
        catalogSize={6}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("shows a single image without thumbnails", () => {
    render(<ProductGallery images={["/only.jpg"]} alt="Piece" pieceNumber="01" catalogSize={6} />);

    expect(screen.getByAltText("Piece")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
