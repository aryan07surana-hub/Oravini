import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfDay, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, Video, Upload, Check, ChevronLeft, ChevronRight, MapPin, Globe } from "lucide-react";

const GOLD = "#d4b461";

export default function PublicBookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"info" | "time" | "details" | "confirm">("info");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    answers: {} as Record<string, string>,
  });
  const [files, setFiles] = useState<File[]>([]);

  // Detect client timezone
  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch meeting type
  const { data: meetingType, isLoading } = useQuery({
    queryKey: [`/api/booking/${slug}`],
    queryFn: () => fetch(`/api/booking/${slug}`).then(r => r.json()),
    enabled: !!slug,
  });

  // Fetch available slots for selected date
  const { data: slotsData } = useQuery({
    queryKey: [`/api/booking/${slug}/available-slots`, selectedDate],
    queryFn: () => {
      if (!selectedDate) return { slots: [] };
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      return fetch(`/api/booking/${slug}/available-slots?date=${dateStr}&timezone=${clientTimezone}`).then(r => r.json());
    },
    enabled: !!selectedDate && !!slug,
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const formDataObj = new FormData();
      formDataObj.append("clientName", formData.clientName);
      formDataObj.append("clientEmail", formData.clientEmail);
      formDataObj.append("clientPhone", formData.clientPhone);
      formDataObj.append("startTime", selectedSlot);
      formDataObj.append("clientTimezone", clientTimezone);
      formDataObj.append("answers", JSON.stringify(formData.answers));
      
      files.forEach(file => {
        formDataObj.append("files", file);
      });

      const res = await fetch(`/api/booking/${slug}`, {
        method: "POST",
        body: formDataObj,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Booking failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        setStep("confirm");
      }
    },
    onError: (error: any) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  const brandColor = meetingType?.brandingConfig?.primaryColor || GOLD;
  const brandLogo = meetingType?.brandingConfig?.logoUrl;
  const companyName = meetingType?.brandingConfig?.companyName || "Oravini";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: brandColor }} />
      </div>
    );
  }

  if (!meetingType) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-2">Booking page not found</p>
          <p className="text-zinc-500">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  const customQuestions = meetingType.customQuestions ? JSON.parse(meetingType.customQuestions) : [];
  const minDate = addDays(new Date(), Math.ceil((meetingType.minNoticeHours || 24) / 24));
  const maxDate = addDays(new Date(), meetingType.maxBookingDays || 60);

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {brandLogo && (
            <img src={brandLogo} alt={companyName} className="h-12 mx-auto mb-6" />
          )}
          <h1 className="text-3xl font-bold text-white mb-2">{meetingType.title}</h1>
          {meetingType.description && (
            <p className="text-zinc-400 max-w-2xl mx-auto">{meetingType.description}</p>
          )}
          
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{meetingType.duration} minutes</span>
            </div>
            {meetingType.location && (
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span>Video call</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>{clientTimezone}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["info", "time", "details", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s ? "text-black" : "text-zinc-600"
                }`}
                style={{ background: step === s ? brandColor : "#27272a" }}
              >
                {i + 1}
              </div>
              {i < 3 && <div className="w-12 h-0.5 bg-zinc-800" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {/* Step 1: Info */}
          {step === "info" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Select a date & time</h2>
              
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < minDate || date > maxDate}
                className="rounded-xl border border-zinc-800"
              />

              {selectedDate && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep("time")}
                    style={{ background: brandColor, color: "#000" }}
                    className="font-bold"
                  >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Time */}
          {step === "time" && (
            <div className="space-y-6">
              <Button variant="ghost" onClick={() => setStep("info")} className="text-zinc-400 -ml-2">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                </h2>
                <p className="text-sm text-zinc-500">Pick an available time slot</p>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {slotsData?.slots.length === 0 && (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-zinc-500">No available slots for this date</p>
                  </div>
                )}
                {slotsData?.slots.map((slot: string) => {
                  const time = new Date(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep("details");
                      }}
                      className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors text-center"
                    >
                      <p className="text-sm font-semibold text-white">
                        {format(time, "h:mm a")}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === "details" && (
            <div className="space-y-6">
              <Button variant="ghost" onClick={() => setStep("time")} className="text-zinc-400 -ml-2">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              <div>
                <h2 className="text-xl font-bold text-white mb-2">Enter your details</h2>
                <p className="text-sm text-zinc-500">
                  {selectedDate && format(parseISO(selectedSlot), "EEEE, MMMM d 'at' h:mm a")}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-2">Name *</label>
                  <Input
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="John Smith"
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-2">Email *</label>
                  <Input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="john@example.com"
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-400 mb-2">Phone</label>
                  <Input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="bg-zinc-950 border-zinc-700 text-white"
                  />
                </div>

                {/* Custom Questions */}
                {customQuestions.map((q: any) => (
                  <div key={q.id}>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">
                      {q.label} {q.required && "*"}
                    </label>
                    {q.type === "textarea" ? (
                      <Textarea
                        value={formData.answers[q.id] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            answers: { ...formData.answers, [q.id]: e.target.value },
                          })
                        }
                        className="bg-zinc-950 border-zinc-700 text-white"
                        rows={3}
                      />
                    ) : (
                      <Input
                        value={formData.answers[q.id] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            answers: { ...formData.answers, [q.id]: e.target.value },
                          })
                        }
                        className="bg-zinc-950 border-zinc-700 text-white"
                      />
                    )}
                  </div>
                ))}

                {/* File Upload */}
                {meetingType.allowFileUpload && (
                  <div>
                    <label className="block text-sm font-semibold text-zinc-400 mb-2">
                      Attachments {meetingType.requireFileUpload && "*"}
                    </label>
                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center">
                      <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <input
                        type="file"
                        multiple
                        accept={meetingType.acceptedFileTypes}
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm text-zinc-400">Click to upload files</span>
                        <p className="text-xs text-zinc-600 mt-1">
                          Max {meetingType.maxFileSize}MB
                        </p>
                      </label>
                      {files.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {files.map((f, i) => (
                            <p key={i} className="text-xs text-zinc-500">
                              ✓ {f.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => bookingMutation.mutate()}
                disabled={!formData.clientName || !formData.clientEmail || bookingMutation.isPending}
                style={{ background: brandColor, color: "#000" }}
                className="w-full font-bold"
              >
                {bookingMutation.isPending ? "Booking..." : meetingType.requirePayment ? `Pay $${(meetingType.paymentAmount / 100).toFixed(2)} & Book` : "Confirm Booking"}
              </Button>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === "confirm" && (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: `${brandColor}20` }}>
                <Check className="w-8 h-8" style={{ color: brandColor }} />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {meetingType.requireApproval ? "Booking Submitted!" : "You're all set!"}
                </h2>
                <p className="text-zinc-400">
                  {meetingType.requireApproval
                    ? "Your booking is pending approval. You'll receive a confirmation email once approved."
                    : "A confirmation email has been sent with your meeting details."}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-left max-w-md mx-auto">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Meeting Details</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-white">
                      {selectedDate && format(parseISO(selectedSlot), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-white">{meetingType.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Video className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-white">Video call link in confirmation email</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-600">
                Powered by {companyName}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
