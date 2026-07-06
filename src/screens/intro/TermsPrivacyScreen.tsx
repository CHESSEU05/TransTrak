import { useState } from "react";
import { Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronDown, ChevronUp } from "lucide-react-native";

import Button from "../../components/ui/Button";
import Checkbox from "../../components/ui/Checkbox";
import { useAuth } from "../../context/AuthContext";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type TermsNavProp = NativeStackNavigationProp<AuthStackParamList, "TermsPrivacy">;
type TermsRouteProp = RouteProp<AuthStackParamList, "TermsPrivacy">;

type DocumentKey = "terms" | "privacy";

type LegalSection = {
  heading: string;
  body: string;
};

const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: "1. Accepting these Terms",
    body: "By creating a TransTrak account you agree to use the app responsibly and in line with these Terms of Service and all applicable local laws in Cameroon.",
  },
  {
    heading: "2. Using TransTrak",
    body: "TransTrak helps passengers find nearby taxis and bikes and helps drivers connect with riders along their route. The app is a coordination tool; it does not itself provide transport services.",
  },
  {
    heading: "3. Passenger and Driver Conduct",
    body: "Passengers and drivers agree to treat each other with respect, arrive on time where possible, and use trip and incident reporting tools honestly.",
  },
  {
    heading: "4. Trip Reporting and Safety",
    body: "Live trip tracking and incident reports help keep the community safe. Misuse of the reporting feature may result in account suspension.",
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Information We Collect",
    body: "We collect the details you provide at sign-up, such as your name, phone number and email, along with vehicle details for driver accounts.",
  },
  {
    heading: "2. Location Data",
    body: "With your permission, TransTrak uses your device location to show nearby rides, match routes, and enable live trip tracking during active trips.",
  },
  {
    heading: "3. How We Use Your Information",
    body: "Your information is used to match passengers and drivers, keep trips safe, improve the service, and communicate important account updates.",
  },
  {
    heading: "4. Data Security and Retention",
    body: "We apply reasonable safeguards to protect your data and retain it only for as long as needed to provide the service or meet legal obligations.",
  },
];

function AccordionItem({
  section,
  expanded,
  onToggle,
}: {
  section: LegalSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="border-b border-divider py-4">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        className="flex-row items-center justify-between"
      >
        <Text className="mr-3 flex-1 font-jakarta-semibold text-sm text-text">
          {section.heading}
        </Text>
        {expanded ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
      </TouchableOpacity>
      {expanded ? (
        <Text className="mt-2 font-jakarta text-sm leading-5 text-textSecondary">
          {section.body}
        </Text>
      ) : null}
    </View>
  );
}

export function TermsPrivacyScreen() {
  const navigation = useNavigation<TermsNavProp>();
  const { params } = useRoute<TermsRouteProp>();
  const { draft } = params;
  const { register } = useAuth();

  const [activeDoc, setActiveDoc] = useState<DocumentKey>("terms");
  const [expandedHeading, setExpandedHeading] = useState<string | null>(TERMS_SECTIONS[0].heading);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sections = activeDoc === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  function switchDoc(doc: DocumentKey) {
    setActiveDoc(doc);
    setExpandedHeading(null);
  }

  async function handleAgreeAndContinue() {
    setSubmitError(null);

    if (!agreed) {
      setSubmitError("Please accept the terms and privacy policy to continue.");
      return;
    }

    setSubmitting(true);

    try {
      await register(draft);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-background p-safe">
      <StatusBar barStyle="dark-content" />

      <View className="items-center px-6 pt-6">
        <Image
          source={require("../../assets/images/terms-illustration.png")}
          className="mb-4 h-32 w-32"
          resizeMode="contain"
        />
        <Text className="mb-1 text-center font-jakarta-bold text-2xl text-text">Almost there!</Text>
        <Text className="text-center font-jakarta text-base text-textSecondary">
          Please review and accept to continue.
        </Text>
      </View>

      <View className="flex-1 px-6 pt-5">
        <View className="mb-3 flex-row rounded-xl bg-divider/60 p-1">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => switchDoc("terms")}
            className={`flex-1 items-center rounded-lg py-2.5 ${activeDoc === "terms" ? "bg-surface" : ""}`}
          >
            <Text
              className={`font-jakarta-semibold text-sm ${
                activeDoc === "terms" ? "text-accent" : "text-textSecondary"
              }`}
            >
              Terms of Service
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => switchDoc("privacy")}
            className={`flex-1 items-center rounded-lg py-2.5 ${activeDoc === "privacy" ? "bg-surface" : ""}`}
          >
            <Text
              className={`font-jakarta-semibold text-sm ${
                activeDoc === "privacy" ? "text-accent" : "text-textSecondary"
              }`}
            >
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="mb-4 flex-1 rounded-2xl border border-divider bg-surface px-4"
          showsVerticalScrollIndicator={false}
        >
          <Text className="pb-1 pt-4 font-jakarta text-xs text-textSecondary">
            By continuing, you agree to our Terms of Service and confirm that you have read our Privacy Policy.
          </Text>
          {sections.map((section) => (
            <AccordionItem
              key={section.heading}
              section={section}
              expanded={expandedHeading === section.heading}
              onToggle={() =>
                setExpandedHeading((current) => (current === section.heading ? null : section.heading))
              }
            />
          ))}
          <View className="h-2" />
        </ScrollView>

        <Checkbox
          checked={agreed}
          onToggle={() => setAgreed((current) => !current)}
          label="I have read and agree to the Terms of Service and Privacy Policy."
          className="mb-4"
        />

        {submitError ? (
          <Text className="mb-3 font-jakarta text-xs text-danger">{submitError}</Text>
        ) : null}

        <Button
          label="Agree & Continue"
          onPress={handleAgreeAndContinue}
          disabled={submitting}
          loading={submitting}
          className="mb-3"
        />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          className="mb-6 self-center"
        >
          <Text className="font-jakarta-semibold text-sm text-textSecondary">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
