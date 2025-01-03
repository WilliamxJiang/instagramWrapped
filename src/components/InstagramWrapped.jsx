import React, { useState } from "react";
import {
  Upload,
  Clock,
  Users,
  Share2,
  Eye,
  MessageCircle,
  Heart,
  Calendar,
} from "lucide-react";

const InstagramWrapped = () => {
  const [stats, setStats] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState("username");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const processInboxData = async (files) => {
    const userOwnName = username;
    const EXCLUDED_SENDERS = ["Meta AI"];
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    const stats = {
      mostTexted: { user: "", count: 0 },
      totalMessagesSent: 0,
      mostTextsFrom: { user: "", count: 0 },
      topGroupChat: { name: "", messageCount: 0 },
      mostSharesReceived: { user: "", count: 0 },
      mostSharesSent: { user: "", count: 0 },
      leftOnSeen: { user: "", count: 0 },
      youLeftOnSeen: { user: "", count: 0 },
      responseTime: { fastest: { user: "", time: Infinity } },
      firstMessageOfYear: { user: "", date: Infinity },
    };

    const messagesSentTo = {};
    const messagesReceivedFrom = {};
    const sharesReceived = {};
    const sharesSent = {};
    const leftOnSeenCounts = {};
    const youLeftOnSeenCounts = {};
    const responseTimes = {};
    let oldestMessage = { timestamp: Infinity, participant: "" };

    for (const file of files) {
      if (file.name.endsWith(".json")) {
        const content = await file.text();
        const conversation = JSON.parse(content);

        if (!conversation.participants || !conversation.messages) continue;

        const isGroup = conversation.participants.length > 2;

        if (isGroup) {
          const messageCount = conversation.messages.length;
          if (messageCount > stats.topGroupChat.messageCount) {
            stats.topGroupChat = {
              name: conversation.title || "Unnamed Group",
              messageCount,
            };
          }
        }

        let lastMessageTimestamp = null;
        let lastMessageSender = null;

        const chronologicalMessages = [...conversation.messages].reverse();

        for (const msg of chronologicalMessages) {
          const msgTimestamp = msg.timestamp_ms;
          const otherParticipant = conversation.participants.find(
            (p) => p.name !== userOwnName && !EXCLUDED_SENDERS.includes(p.name)
          )?.name;

          if (otherParticipant) {
            if (msgTimestamp < oldestMessage.timestamp) {
              oldestMessage = {
                timestamp: msgTimestamp,
                participant: otherParticipant,
              };
            }

            if (!isGroup) {
              if (msg.sender_name === userOwnName) {
                stats.totalMessagesSent++;
                messagesSentTo[otherParticipant] =
                  (messagesSentTo[otherParticipant] || 0) + 1;
              } else if (msg.sender_name === otherParticipant) {
                messagesReceivedFrom[otherParticipant] =
                  (messagesReceivedFrom[otherParticipant] || 0) + 1;
              }
            }

            if (msg.share && !isGroup) {
              if (msg.sender_name === userOwnName) {
                sharesSent[otherParticipant] =
                  (sharesSent[otherParticipant] || 0) + 1;
              } else if (msg.sender_name === otherParticipant) {
                sharesReceived[otherParticipant] =
                  (sharesReceived[otherParticipant] || 0) + 1;
              }
            }

            if (!isGroup && lastMessageTimestamp) {
              const timeDiff = msgTimestamp - lastMessageTimestamp;

              if (lastMessageSender !== msg.sender_name) {
                if (
                  lastMessageSender === otherParticipant &&
                  msg.sender_name === userOwnName &&
                  timeDiff > TWELVE_HOURS_MS
                ) {
                  youLeftOnSeenCounts[otherParticipant] =
                    (youLeftOnSeenCounts[otherParticipant] || 0) + 1;
                } else if (
                  lastMessageSender === userOwnName &&
                  msg.sender_name === otherParticipant &&
                  timeDiff > TWELVE_HOURS_MS
                ) {
                  leftOnSeenCounts[otherParticipant] =
                    (leftOnSeenCounts[otherParticipant] || 0) + 1;
                }

                if (!responseTimes[otherParticipant]) {
                  responseTimes[otherParticipant] = [];
                }
                responseTimes[otherParticipant].push(timeDiff);
              }
            }

            lastMessageTimestamp = msgTimestamp;
            lastMessageSender = msg.sender_name;
          }
        }
      }
    }

    if (oldestMessage.timestamp !== Infinity) {
      stats.firstMessageOfYear = {
        user: oldestMessage.participant,
        date: oldestMessage.timestamp,
      };
    }

    stats.mostTexted = Object.entries(messagesSentTo).reduce(
      (max, [user, count]) => (count > max.count ? { user, count } : max),
      { user: "", count: 0 }
    );

    stats.mostTextsFrom = Object.entries(messagesReceivedFrom).reduce(
      (max, [user, count]) => (count > max.count ? { user, count } : max),
      { user: "", count: 0 }
    );

    stats.mostSharesReceived = Object.entries(sharesReceived).reduce(
      (max, [user, count]) => (count > max.count ? { user, count } : max),
      { user: "", count: 0 }
    );

    stats.mostSharesSent = Object.entries(sharesSent).reduce(
      (max, [user, count]) => (count > max.count ? { user, count } : max),
      { user: "", count: 0 }
    );

    stats.leftOnSeen = Object.entries(leftOnSeenCounts).reduce(
      (max, [user, count]) => (count > max.count ? { user, count } : max),
      { user: "", count: 0 }
    );

    stats.youLeftOnSeen = Object.entries(youLeftOnSeenCounts).reduce(
      (max, [user, count]) => (count > max.count ? { user, count } : max),
      { user: "", count: 0 }
    );

    Object.entries(responseTimes).forEach(([user, times]) => {
      if (times.length > 0) {
        const avgTime =
          times.reduce((sum, time) => sum + time, 0) / times.length;
        if (avgTime < stats.responseTime.fastest.time) {
          stats.responseTime.fastest = { user, time: avgTime };
        }
      }
    });

    return stats;
  };

  const handleFileUpload = async (event) => {
    setLoading(true);
    const files = event.target.files;

    try {
      const processedStats = await processInboxData(Array.from(files));
      setStats(processedStats);
      setStep("wrapped");
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Error processing files. Please upload the correct data.");
    } finally {
      setLoading(false);
    }
  };

  const slides = stats
    ? [
        {
          icon: <MessageCircle className="w-12 h-12 text-pink-500" />,
          title: "😈Messaging Warrior?",
          content: (
            <>
              <h3 className="text-3xl font-bold text-pink-500">
                {stats.totalMessagesSent.toLocaleString()}
              </h3>
              <p className="text-gray-600">messages sent in total</p>
            </>
          ),
        },
        {
          icon: <MessageCircle className="w-12 h-12 text-pink-500" />,
          title: "Your Top Texter",
          content: (
            <>
              <h3 className="text-2xl font-bold text-pink-500">
                {stats.mostTexted.user}
              </h3>
              <p className="text-gray-600">
                You sent {stats.mostTexted.count.toLocaleString()} messages
              </p>
            </>
          ),
        },
        {
          icon: <Heart className="w-12 h-12 text-pink-500" />,
          title: "Your Biggest Fan",
          content: (
            <>
              <h3 className="text-2xl font-bold text-pink-500">
                {stats.mostTextsFrom.user}
              </h3>
              <p className="text-gray-600">
                Sent you {stats.mostTextsFrom.count.toLocaleString()} messages
              </p>
            </>
          ),
        },
        {
          icon: <Users className="w-12 h-12 text-purple-500" />,
          title: "Most Active Group Chat",
          content: (
            <>
              <h3 className="text-2xl font-bold text-purple-500">
                {stats.topGroupChat.name}
              </h3>
              <p className="text-gray-600">
                {stats.topGroupChat.messageCount.toLocaleString()} messages
              </p>
            </>
          ),
        },
        {
          icon: <Share2 className="w-12 h-12 text-blue-500" />,
          title: "🎯 Meme Master",
          content: (
            <>
              <h3 className="text-2xl font-bold text-blue-500">
                {stats.mostSharesSent.user}
              </h3>
              <p className="text-gray-600">
                You sent {stats.mostSharesSent.count.toLocaleString()} posts
              </p>
            </>
          ),
        },
        {
          icon: <Share2 className="w-12 h-12 text-indigo-500" />,
          title: "🧲 Meme Magnet",
          content: (
            <>
              <h3 className="text-2xl font-bold text-indigo-500">
                {stats.mostSharesReceived.user}
              </h3>
              <p className="text-gray-600">
                Sent you {stats.mostSharesReceived.count.toLocaleString()} posts
              </p>
            </>
          ),
        },
        {
          icon: <Eye className="w-12 h-12 text-red-500" />,
          title: "👻 Left You on Seen",
          content: (
            <>
              <h3 className="text-2xl font-bold text-red-500">
                {stats.leftOnSeen.user}
              </h3>
              <p className="text-gray-600">
                Left you on seen {stats.leftOnSeen.count.toLocaleString()} times
              </p>
            </>
          ),
        },
        {
          icon: <Eye className="w-12 h-12 text-orange-500" />,
          title: "😅 You Left on Seen",
          content: (
            <>
              <h3 className="text-2xl font-bold text-orange-500">
                {stats.youLeftOnSeen.user}
              </h3>
              <p className="text-gray-600">
                You left them on seen{" "}
                {stats.youLeftOnSeen.count.toLocaleString()} times
              </p>
            </>
          ),
        },
        {
          icon: <Clock className="w-12 h-12 text-yellow-500" />,
          title: "⏱️ Fastest Responder",
          content: (
            <>
              <h3 className="text-2xl font-bold text-yellow-500">
                {stats.responseTime.fastest.user}
              </h3>
              <p className="text-gray-600">
                Average response time:{" "}
                {(stats.responseTime.fastest.time / (1000 * 60)).toFixed(2)}{" "}
                minutes
              </p>
            </>
          ),
        },
        {
          icon: <Calendar className="w-12 h-12 text-indigo-500" />,
          title: "⭐️ OG Chatter",
          content: (
            <>
              <h3 className="text-2xl font-bold text-indigo-500">
                {stats.firstMessageOfYear.user}
              </h3>
              <p className="text-gray-600">
                First message on{" "}
                {new Date(stats.firstMessageOfYear.date).toLocaleDateString()}
              </p>
            </>
          ),
        },
        {
          icon: <MessageCircle className="w-12 h-12 text-pink-500" />,
          title: "2024 Wrapped Summary",
          content: (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-pink-500">
                  Top Connection
                </h3>
                <p className="text-gray-600">
                  {stats.mostTexted.user} (
                  {stats.mostTexted.count.toLocaleString()} messages sent)
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-pink-500">Biggest Fan</h3>
                <p className="text-gray-600">
                  {stats.mostTextsFrom.user} (
                  {stats.mostTextsFrom.count.toLocaleString()} messages
                  received)
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-500">
                  Group Champion
                </h3>
                <p className="text-gray-600">
                  {stats.topGroupChat.name} (
                  {stats.topGroupChat.messageCount.toLocaleString()} messages)
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-500">
                  Meme Exchange
                </h3>
                <p className="text-gray-600">
                  Sent: {stats.mostSharesSent.user} (
                  {stats.mostSharesSent.count})
                </p>
                <p className="text-gray-600">
                  Received: {stats.mostSharesReceived.user} (
                  {stats.mostSharesReceived.count})
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-500">
                  👻 Ghostbuster
                </h3>
                <p className="text-gray-600">
                  Left You on Seen: {stats.leftOnSeen.user} (
                  {stats.leftOnSeen.count.toLocaleString()} times)
                </p>
                <p className="text-gray-600">
                  You Left on Seen: {stats.youLeftOnSeen.user} (
                  {stats.youLeftOnSeen.count.toLocaleString()} times)
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-500">
                  Fastest Responder
                </h3>
                <p className="text-gray-600">
                  {stats.responseTime.fastest.user} (Average response time:{" "}
                  {(stats.responseTime.fastest.time / (1000 * 60)).toFixed(2)}{" "}
                  minutes)
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-500">
                  OG Chatter
                </h3>
                <p className="text-gray-600">
                  {stats.firstMessageOfYear.user} (First message on{" "}
                  {new Date(stats.firstMessageOfYear.date).toLocaleDateString()}
                  )
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 mt-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg shadow-md hover:opacity-90 transition-all"
              >
                Restart
              </button>
            </div>
          ),
        },
      ]
    : [];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-purple-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-6 text-center">
        {step === "username" && (
          <>
            <h1 className="text-3xl font-bold text-pink-500 mb-4">
              Instagram Wrapped
            </h1>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Enter your Instagram name"
            />
            <button
              onClick={() => setStep("upload")}
              className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg"
            >
              Continue
            </button>
          </>
        )}
        {step === "upload" && (
          <>
            <h1 className="text-3xl font-bold text-pink-500 mb-4">
              Upload Your Data
            </h1>
            <input
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileUpload}
              className="w-full border border-gray-300 rounded-lg p-2"
            />
            {loading && <p className="text-gray-600 mt-4">Processing...</p>}
          </>
        )}
        {step === "wrapped" && stats && (
          <>
            <div className="mb-6">
              {slides[currentSlide].icon}
              <h2 className="text-2xl font-bold mb-2">
                {slides[currentSlide].title}
              </h2>
              <div>{slides[currentSlide].content}</div>
            </div>
            <button
              onClick={nextSlide}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:opacity-90"
            >
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InstagramWrapped;
