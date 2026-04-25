import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Layout, MonitorPlay, TrendingUp, Video } from "lucide-react";

export default function PlatformView() {
    const { data
