import { useState, useEffect, useRef } from "react";
import { Mail, X, Check } from "lucide-react";

interface OTPModalProps {
  email: string;
  generatedOTP: string;
  otpTimestamp: number;
  onVerifySuccess: () => void;
  onClose: () => void;
  onResendOTP: () => void;
}

export function OTPModal({
  email,
  generatedOTP,
  otpTimestamp,
  onVerifySuccess,
  onClose,
  onResendOTP,
}: OTPModalProps) {
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(true);
  const [resendCount, setResendCount] = useState(0);
  
  const countdownInterval = useRef<number | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      countdownInterval.current = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownInterval.current) {
              clearInterval(countdownInterval.current);
            }
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [resendCount]);

  useEffect(() => {
    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleVerifyOTP = () => {
    if (otpValue.length !== 6) {
      setOtpError("Vui lòng nhập đầy đủ 6 số");
      return;
    }

    setIsVerifying(true);
    setOtpError("");

    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - otpTimestamp) / 1000;
    
    if (elapsedSeconds > 60) {
      setOtpError("Mã đã hết hạn, vui lòng tạo một mã mới");
      setIsVerifying(false);
      return;
    }
    //Xóa so sánh Frontend. Gọi API gửi otpValue lên Backend để xác thực thực tế tại đây
    if (otpValue === generatedOTP) {
      setIsSuccess(true);
      setTimeout(() => {
        onVerifySuccess();
        setIsVerifying(false);
      }, 1000);
    } else {
      setOtpError("Mã không hợp lệ");
      setIsVerifying(false);
    }
  };

  const handleResendOTP = () => {
    if (!canResend) return;
    
    onResendOTP();
    setOtpValue("");
    setOtpError("");
    setResendCount(prev => prev + 1);
    setCountdown(60);
    setCanResend(false);
  };

  const handleOTPChange = (value: string) => {
    setOtpValue(value);
    setOtpError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        {!isSuccess ? (
          <>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="mb-6 text-center">
              <div className="mb-4 inline-flex rounded-full bg-cyan-100 p-4">
                <Mail className="h-8 w-8 text-cyan-600" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Xác nhận OTP</h2>
              <p className="text-sm text-gray-600">
                Mã xác nhận đã được gửi qua email của bạn
              </p>
              <p className="mt-1 text-sm font-semibold text-cyan-600">
                {email}
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpValue[index] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      
                      if (!/^[0-9]?$/.test(val)) {
                        return;
                      }
                      
                      const newOTP = otpValue.split("");
                      while (newOTP.length < 6) newOTP.push("");
                      newOTP[index] = val;
                      handleOTPChange(newOTP.join(""));
                      
                      if (val && index < 5) {
                        otpInputRefs.current[index + 1]?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace") {
                        if (!otpValue[index] && index > 0) {
                          otpInputRefs.current[index - 1]?.focus();
                        } else {
                          setTimeout(() => {
                            const newOTP = otpValue.split("");
                            while (newOTP.length < 6) newOTP.push("");
                            if (!newOTP[index] && index > 0) {
                              otpInputRefs.current[index - 1]?.focus();
                            }
                          }, 0);
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData.getData("text").trim().slice(0, 6);
                      if (/^[0-9]{1,6}$/.test(pastedData)) {
                        handleOTPChange(pastedData.padEnd(6, ""));
                        const nextIndex = Math.min(pastedData.length, 5);
                        otpInputRefs.current[nextIndex]?.focus();
                      }
                    }}
                    className="h-12 w-12 rounded-xl border-2 border-gray-300 text-center text-xl font-bold text-gray-900 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                ))}
              </div>
              
              {otpError && (
                <p className="mt-3 text-center text-sm text-red-500">{otpError}</p>
              )}
              
              {countdown > 0 ? (
                <p className="mt-3 text-center text-xs text-gray-500">
                  Mã có hiệu lực trong {countdown} giây
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-red-500 font-semibold">
                  Mã đã hết hiệu lực, hãy yêu cầu gửi lại mã mới
                </p>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyOTP}
              disabled={isVerifying || otpValue.length !== 6}
              className="mb-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isVerifying ? "Đang xác nhận..." : "Xác nhận"}
            </button>

            {/* Resend & Change Email */}
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={handleResendOTP}
                disabled={!canResend}
                className="font-semibold text-cyan-600 hover:text-cyan-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {canResend ? "Gửi lại mã" : `Gửi lại (${countdown}s)`}
              </button>
              
              <button
                onClick={onClose}
                className="font-semibold text-gray-600 hover:text-gray-700"
              >
                Đổi email
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-6 inline-flex rounded-full bg-green-100 p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                <Check className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Xác thực thành công</h2>
            <p className="text-gray-600">Đang xử lý...</p>
          </div>
        )}
      </div>
    </div>
  );
}
