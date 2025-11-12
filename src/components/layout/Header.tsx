"use client";

import React from "react";
import { useGrocery } from "@/context/GroceryContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

const Header: React.FC = () => {
  const { title, updateTitle } = useGrocery();

  const form = useForm({
    defaultValues: {
      title: title || "",
    },
  });

  // Sync form value when title changes (e.g., from session restore)
  React.useEffect(() => {
    form.setValue("title", title);
  }, [title, form]);

  const handleChange = (value: string) => {
    updateTitle(value);
  };

  return (
    <header className="text-center py-8 space-y-4">
      <h1 className="text-4xl font-bold text-slate-800 dark:text-white">
        🛒 Grocery List
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-2">
        Plan your shopping with ease
      </p>

      <div className="flex justify-center">
        <Form {...form}>
          <form className="w-full max-w-sm">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e);
                        handleChange(e.target.value);
                      }}
                      placeholder="Enter your grocery list title..."
                      className="text-center border-slate-300 dark:border-slate-700 rounded-xl text-lg py-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </header>
  );
};

export default Header;
