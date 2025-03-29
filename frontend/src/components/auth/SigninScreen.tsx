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

interface IFormProps {
  phone: string;
  password: string;
}

const SigninScreen: React.FC = () => {
  const router = useRouter();
  const { onlyNumbers } = useFormEvents();

  const [formValues, setFormValues] = useState<IFormProps>({
    phone: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    router.push("/market");
  };

  return (
    <MainLayout>
      <div className="flex flex-center full-height">
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
              <h1 className="form-title center">Sign In</h1>
              <form className="form" onSubmit={handleSubmit} noValidate>
                <div className="form-elements">
                  <div className="form-line">
                    <div className="full-width">
                      <label htmlFor="phone">Your phone number</label>
                      <FormInput
                        type="text"
                        name="phone"
                        onKeyDown={onlyNumbers}
                        onChange={handleChange}
                        value={formValues.phone}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                  <div className="form-line">
                    <div className="full-width">
                      <label htmlFor="password">Your password</label>
                      <FormInput
                        type="password"
                        name="password"
                        onChange={handleChange}
                        value={formValues.password}
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>
                  <div className="form-line right">
                    <Link href="/forgot-password">Forgot password?</Link>
                  </div>
                  <div className="form-line">
                    <div className="buttons">
                      <FormButton type="submit" text="Sign In" onClick={handleSubmit} />
                    </div>
                  </div>
                  <div className="form-line center">
                    <p>
                      If you don't have an account,{" "}
                      <Link href="/signup">create a new account</Link>.
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

export default SigninScreen;
