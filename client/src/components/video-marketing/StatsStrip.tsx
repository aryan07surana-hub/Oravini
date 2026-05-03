const GOLD = "#d4b461";

export default function StatsStrip() {
    const stats = [
        { value: "50K+", label: "Attendees Hosted" },
        { value: "12M+", label: "Video Views" },
        { value: "94%", label: "Engagement Rate" },
        { value: "4.9★", label: "User Rating" },
    ];
    return (
        <section
            className="relative py-10 border-y"
            style={{
                borderColor: "rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.02)",
            }}
        >
            <div className="max-w-7xl mx-auto px-5 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((s) => (
                    <div key={s.label} className="text-center">
                        <div
                            className="text-2xl md:text-3xl font-black"
                            style={{ color: GOLD }}
                        >
                            {s.value}
                        </div>
                        <div className="text-[10px] md:text-xs text-zinc-500 mt-1 uppercase tracking-[0.15em] font-semibold">
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
