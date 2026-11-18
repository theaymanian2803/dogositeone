import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import {
  AdminBadge,
  AdminCard,
  AdminEmpty,
  AdminField,
  AdminNote,
  AdminPageHeader,
  AdminTable,
  ImageField,
  inputClass,
  textareaClass,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminDeleteReviewFn,
  adminProductsFn,
  adminReviewStatusFn,
  adminReviewsFn,
  adminSaveReviewFn,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/reviews")({
  loader: async () => {
    const [reviews, products] = await Promise.all([adminReviewsFn(), adminProductsFn()]);
    return { reviews, products };
  },
  component: AdminReviews,
});

function AdminReviews() {
  const { reviews, products } = Route.useLoaderData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [authorName, setAuthorName] = useState("PetPals Studio");
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function setStatus(id: string, status: "pending" | "approved") {
    const result = await adminReviewStatusFn({ data: { id, status } });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this review?")) return;
    const result = await adminDeleteReviewFn({ data: { id } });
    if (!result.ok) window.alert(result.error);
    else await router.invalidate();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await adminSaveReviewFn({
      data: {
        productId,
        authorName,
        rating: Number(rating),
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setTitle("");
    setBody("");
    setImageUrl("");
    await router.invalidate();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="REVIEWS"
        description="Approve, reject or add reviews. Approval settings live under Settings."
        action={
          <Button
            onClick={() => setOpen(true)}
            className="rounded-none bg-foreground text-[10px] uppercase tracking-[0.08em] text-background hover:bg-hot-pink hover:text-foreground"
          >
            Add review
          </Button>
        }
      />

      <AdminCard>
        {reviews.length === 0 ? (
          <AdminEmpty>No reviews yet.</AdminEmpty>
        ) : (
          <AdminTable headers={["Product", "Rating", "Review", "Status", "Actions"]}>
            {reviews.map((review) => (
              <tr key={review.id} className="border-b border-border align-top last:border-b-0">
                <td className="py-3 pr-4 font-semibold">
                  {review.productName ?? review.productId}
                </td>
                <td className="py-3 pr-4">
                  {"★".repeat(review.rating)}
                  <span className="text-muted-foreground">{"★".repeat(5 - review.rating)}</span>
                </td>
                <td className="max-w-md py-3 pr-4">
                  {review.title && <p className="font-semibold">{review.title}</p>}
                  <p className="text-[11px] leading-5 text-muted-foreground">{review.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">— {review.authorName}</p>
                  {review.imageUrl && (
                    <img src={review.imageUrl} alt="" className="mt-2 h-16 w-20 object-cover" />
                  )}
                </td>
                <td className="py-3 pr-4">
                  <AdminBadge tone={review.status === "approved" ? "green" : "amber"}>
                    {review.status}
                  </AdminBadge>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {review.status === "approved" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(review.id, "pending")}
                        className="h-7 rounded-none text-[10px] uppercase"
                      >
                        Unapprove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(review.id, "approved")}
                        className="h-7 rounded-none text-[10px] uppercase"
                      >
                        Approve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(review.id)}
                      className="h-7 rounded-none text-[10px] uppercase text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">ADD REVIEW</DialogTitle>
            <DialogDescription className="text-xs">
              Added reviews publish immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="mt-4 space-y-4">
            <AdminField label="Product">
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className={inputClass}
                required
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Reviewer name">
                <input
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                  className={inputClass}
                  required
                />
              </AdminField>
              <AdminField label="Rating">
                <select
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  className={inputClass}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} ★
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
            <AdminField label="Title (optional)">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={inputClass}
              />
            </AdminField>
            <AdminField label="Review">
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className={textareaClass}
              />
            </AdminField>
            <ImageField value={imageUrl} onChange={setImageUrl} label="Photo (optional)" />
            {error && <AdminNote tone="error">{error}</AdminNote>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-none text-[10px] uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="rounded-none bg-foreground text-[10px] uppercase text-background hover:bg-hot-pink hover:text-foreground"
              >
                {pending ? "Saving…" : "Publish review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
