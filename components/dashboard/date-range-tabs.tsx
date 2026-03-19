"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RangeValue = "1" | "7" | "30";

export function DateRangeTabs({
  value,
  onChange,
}: {
  value: RangeValue;
  onChange?: (next: RangeValue) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localValue, setLocalValue] = useState<RangeValue>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function handleChange(nextValue: string) {
    const next = nextValue === "1" || nextValue === "30" ? nextValue : "7";
    setLocalValue(next);

    if (onChange) {
      onChange(next);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={localValue} onValueChange={handleChange}>
      <TabsList className="h-10 rounded-xl border border-zinc-200 bg-zinc-100 p-1">
        <TabsTrigger value="1" className="cursor-pointer px-4 text-sm">
          Today
        </TabsTrigger>
        <TabsTrigger value="7" className="cursor-pointer px-4 text-sm">
          7 Days
        </TabsTrigger>
        <TabsTrigger value="30" className="cursor-pointer px-4 text-sm">
          30 Days
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
