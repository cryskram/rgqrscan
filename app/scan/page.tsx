import QRPage from "@/components/QRPage";

export default async function ScanPageWrapper({ searchParams }: any) {
  const params = await searchParams;
  const id = params.id;

  if (!id) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold">Invalid QR Link</h1>
        <p className="mt-2 text-gray-600">No ID was provided.</p>
      </div>
    );
  }

  return <QRPage uid={id} />;
}
