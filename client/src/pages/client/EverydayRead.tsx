import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function EverydayRead() {
    const { user } = useAuth();
    const { data: reads = [] } = useQuery<any[]>({
        queryKey: ["/api/everyday-reads"],
        enabled: !!user,
    });

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold text-white">Everyday Read</h1>
            </div>
            {(reads as any[]).length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-10 text-center">
                        <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400">No reads available yet. Check back soon.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {(reads as any[]).map((r: any) => (
                        <Card key={r.id} className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-5">
                                <h3 className="font-bold text-white mb-1">{r.title}</h3>
                                {r.content && (
                                    <p className="text-sm text-zinc-400 leading-relaxed">{r.content}</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
