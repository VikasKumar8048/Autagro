'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListingForm, type ListingFormValues } from '@/components/seller/listing-form';
import { sellerApi } from '@/lib/seller-api';
import { useAuthStore } from '@/stores/auth.store';

export default function NewListingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const user = useAuthStore((s) => s.user);

  const createMutation = useMutation({
    mutationFn: (values: ListingFormValues) =>
      sellerApi.createListing(accessToken, {
        cropName: values.cropName,
        variety: values.variety,
        quantity: Number(values.quantity),
        unit: values.unit,
        grade: values.grade,
        harvestDate: values.harvestDate,
        pricePerUnit: Number(values.pricePerUnit),
        state: values.state || user?.profile?.state,
        district: values.district || user?.profile?.district,
        pincode: values.pincode || user?.profile?.pincode,
        imageUrls: [],
      }),
    onSuccess: (listing) => {
      router.push(`/seller/listings?created=${listing.id}`);
    },
  });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create crop listing</CardTitle>
      </CardHeader>
      <CardContent>
        <ListingForm
          initial={{
            state: user?.profile?.state ?? '',
            district: user?.profile?.district ?? '',
            pincode: user?.profile?.pincode ?? '',
          }}
          submitLabel="Save as draft"
          loading={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
        />
        {createMutation.isError && (
          <p className="mt-4 text-sm text-red-600">{createMutation.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
