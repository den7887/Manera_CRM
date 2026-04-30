export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8F4E3] via-[#F8F4E3] to-[#133C2A]/5">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center animate-float soft-shadow">
          <span className="text-white text-5xl">M</span>
        </div>
        <div className="flex gap-2 justify-center">
          <div className="w-3 h-3 rounded-full bg-[#133C2A] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 rounded-full bg-[#133C2A] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="mt-6 text-[#133C2A]/60 italic">Ты автор своего результата</p>
      </div>
    </div>
  );
}
