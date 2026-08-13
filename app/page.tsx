import LayoutClient from "@/components/layout";
import Main from "@/components/main";
import { tickets } from "@/app/_data/tempdata"

export default function Page() {
  const initData = tickets;
  return (
    <div>
      <LayoutClient children={<Main initialTickets={initData}/>} />
    </div>
  )
}



// export default function Page() {
//   return (
//     <div className="flex min-h-svh p-6">
//       <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
//         <div>
//           <h1 className="font-medium">Project ready!</h1>
//           <p>You may now add components and start building.</p>
//           <p>We&apos;ve already added the button component for you.</p>
//           <Button className="mt-2">Button</Button>
//         </div>
//         <div className="font-mono text-xs text-muted-foreground">
//           (Press <kbd>d</kbd> to toggle dark mode)
//         </div>
//       </div>
//       {/* <Toast btnName="Testing" tType="success" /> */}
//     </div>
//   )
// }
