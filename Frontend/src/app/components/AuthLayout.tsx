import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1555041071-a375ca2bdd64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWV0bmFtJTIwdHJhdmVsJTIwYWR2ZW50dXJlJTIwbGFuZHNjYXBlJTIwYmVhdXRpZnVsfGVufDF8fHx8MTc3NDE1Mjc5MXww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Travel"
            className="h-full w-full object-cover"
          />
          {/* Gradient overlay to match theme colors */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/80 via-cyan-500/70 to-orange-500/80" />
        </div>
        
        {/* Content on top of image */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <h1 className="mb-6 text-5xl font-bold leading-tight">
            Khám Phá Việt Nam<br />
            Cùng YourTrip
          </h1>
          <p className="text-xl text-white/90 leading-relaxed">
            Lên kế hoạch cho chuyến đi hoàn hảo với công nghệ AI tiên tiến.
            Khám phá điểm đến mới, tạo lịch trình chi tiết và quản lý ngân sách dễ dàng.
          </p>
          
          <div className="mt-12 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Lịch trình AI thông minh</h3>
                <p className="text-sm text-white/80">Tạo lịch trình tối ưu tự động dựa trên sở thích của bạn</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Quản lý ngân sách</h3>
                <p className="text-sm text-white/80">Theo dõi chi phí chi tiết cho mỗi hoạt động</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Linh hoạt trong mọi hành trình</h3>
                <p className="text-sm text-white/80">Dễ dàng thay đổi kế hoạch bất cứ lúc nào</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-orange-50 p-6 lg:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}