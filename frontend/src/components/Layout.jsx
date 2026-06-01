import React from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout({ children, hideFooter }) {
  return (
    <div className="App min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}
