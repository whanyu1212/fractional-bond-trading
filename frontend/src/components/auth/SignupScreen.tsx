"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// hooks
import useFormEvents from "@/hooks/useFormEvents";

// components
import Box from "@/components/Common/Box";
import MainLayout from "@/layouts/MainLayout";
import FormInput from "@/components/Forms/FormInput";
import FormButton from "@/components/Forms/FormButton";
import FormCheckbox from "@/components/Forms/FormCheckbox";

interface IFormProps {
  email: string;
  phone: string;
  password: string;
  password1: string;
  name: string;
  lastname: string;
  citizenship: boolean;
  identityType: string;
  identityNumber: string;
  day: string;
  month: string;
  year: string;
  country: string;
  operator: string;
  agreeToPolicies1: boolean;
  agreeToPolicies2: boolean;
  agreeToPolicies3: boolean;
}

const SignupScreen: React.FC = () => {
  const router = useRouter();
  const { onlyNumbers, onlyEmail } = useFormEvents();

  const [formValues, setFormValues] = useState<IFormProps>({
    email: "",
    phone: "",
    password: "",
    password1: "",
    name: "",
    lastname: "",
    citizenship: false,
    identityType: "",
    identityNumber: "",
    day: "",
    month: "",
    year: "",
    country: "",
    operator: "",
    agreeToPolicies1: false,
    agreeToPolicies2: false,
    agreeToPolicies3: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, checked } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    // TODO: Add validation and API call logic
    router.push("/market");
  };

  return (
    <MainLayout>
      <div className="flex flex-center">
        <div className="login no-select">
          <Box>
            <div className="box-vertical-padding box-horizontal-padding">
              <div className="form-logo center">
                <img
                  draggable="false"
                  alt="Crypto Exchange"
                  src="/images/logo.png"
                />
              </div>
              <h1 className="form-title center">Create an Account</h1>
              <p className="form-desc center">
                Please enter the information below. We will send activation details to your phone number.
              </p>
              <form className="form" onSubmit={handleSubmit} noValidate>
                <div className="form-elements">
                  <div className="form-line">
                    <label htmlFor="email">Your Email Address</label>
                    <FormInput
                      type="email"
                      name="email"
                      onKeyDown={onlyEmail}
                      onChange={handleChange}
                      value={formValues.email}
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div className="form-line">
                    <label htmlFor="password">Your Password</label>
                    <FormInput
                      type="password"
                      name="password"
                      onChange={handleChange}
                      value={formValues.password}
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className="form-line">
                    <label htmlFor="password1">Confirm Password</label>
                    <FormInput
                      type="password"
                      name="password1"
                      onChange={handleChange}
                      value={formValues.password1}
                      placeholder="Re-enter your password"
                    />
                  </div>
                  <div className="form-line">
                    <label htmlFor="name">First Name</label>
                    <FormInput
                      type="text"
                      name="name"
                      onChange={handleChange}
                      value={formValues.name}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="form-line">
                    <label htmlFor="lastname">Last Name</label>
                    <FormInput
                      type="text"
                      name="lastname"
                      onChange={handleChange}
                      value={formValues.lastname}
                      placeholder="Enter your last name"
                    />
                  </div>

                  <div className="form-line">
                    <FormCheckbox
                      name="citizenship"
                      onChange={handleCheckboxChange}
                      checked={formValues.citizenship}
                      text="I am a citizen of the Republic of Turkey."
                    />
                  </div>

                  <div className="form-line">
                    <div className="buttons">
                      <FormButton
                        type="submit"
                        text="Create Account"
                        onClick={handleSubmit}
                      />
                    </div>
                  </div>

                  <div className="form-line center">
                    <p>
                      Already have an account? <Link href="/signin">Sign in</Link>.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </Box>
        </div>
      </div>
    </MainLayout>
  );
};

export default SignupScreen;
