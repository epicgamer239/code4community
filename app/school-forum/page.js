"use client";

import { useState } from "react";
import ConcernBoard from "@/components/school-forum/ConcernBoard";
import MyPosts from "@/components/school-forum/MyPosts";
import PostConcernForm from "@/components/school-forum/PostConcernForm";
import SchoolForumShell from "@/components/school-forum/SchoolForumShell";
import { Notice, TabPanel, Tabs } from "@/components/school-forum/ui";

const TAB_PREFIX = "forum";

function StudentForum({ overview, reload, user }) {
  const [tab, setTab] = useState("board");
  const [postedMessage, setPostedMessage] = useState("");
  const [myPostsKey, setMyPostsKey] = useState(0);
  const canPost = Boolean(overview.capabilities.post);

  const tabs = [
    { id: "board", label: "Board" },
    ...(canPost ? [{ id: "post", label: "Post a concern" }, { id: "mine", label: "My posts" }] : []),
  ];

  return (
    <>
      <Tabs label="Forum sections" tabs={tabs} active={tab} onChange={setTab} idPrefix={TAB_PREFIX} />
      <TabPanel idPrefix={TAB_PREFIX} id="board" active={tab}>
        <ConcernBoard overview={overview} reload={reload} user={user} />
      </TabPanel>
      <TabPanel idPrefix={TAB_PREFIX} id="post" active={tab}>
        <PostConcernForm
          user={user}
          onPosted={() => {
            setPostedMessage(
              "Thanks! Your concern was sent to SCA moderators. It will appear on the board once it's approved. Check its status here.",
            );
            setMyPostsKey((k) => k + 1);
            setTab("mine");
          }}
        />
      </TabPanel>
      <TabPanel idPrefix={TAB_PREFIX} id="mine" active={tab}>
        <div className="space-y-4">
          <Notice kind="success" focus>
            {postedMessage}
          </Notice>
          <MyPosts user={user} refreshKey={myPostsKey} />
        </div>
      </TabPanel>
    </>
  );
}

export default function SchoolForumPage() {
  return (
    <SchoolForumShell
      title="School Concerns Forum"
      intro="Share what could make school better. Posts are anonymous to students and moderators. Every two weeks, students vote, and the SCA brings the top concerns to school administrators."
    >
      {(props) => <StudentForum {...props} />}
    </SchoolForumShell>
  );
}
